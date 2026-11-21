import { atom, read, update } from 'claude-code'
import type { Hook, Register } from 'claude-code'

const THRESHOLD_TOKENS = 150_000 // keep in step with session-handoff's context-threshold-warn.py
const WARNING_PREFIX = '[CONTEXT WARNING]' // what context-threshold-warn.py prints
const HOUR_MS = 60 * 60_000 // the subscription cache window, and the fallback when the transcript can't say
const FIVE_MIN_MS = 5 * 60_000 // API keys, and subscriptions while over their usage limit
const COOLING_MS = 10 * 60_000 // the last stretch of the window, when a handoff is still cheap
const COOLING_HANDOFF_TOKENS = 100_000 // below this a fresh session saves little: one starts at ~75k
const LIMIT_LABEL: Record<string, string> = { five_hour: '5h', seven_day: 'week' }
const ALARM = 'Cache expires in 10m. Hand off now to resume cheaply later.'
const HANDOFF_MARKER = /^\s*<!--\s*handoff-memory-dir:/ // the first line of a handoff reply, which session-handoff's handoff-save.py saves
// The desktop app has no notification channel for $.ui.notify, so Windows raises the card itself.
// ponytail: Windows only; a Mac would want osascript here
const WINDOWS_CARD = [
  "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null",
  "$t = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)",
  "$x = $t.GetElementsByTagName('text')",
  "$x.Item(0).AppendChild($t.CreateTextNode('Claude Code')) > $null",
  `$x.Item(1).AppendChild($t.CreateTextNode('${ALARM}')) > $null`,
  "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe').Show([Windows.UI.Notifications.ToastNotification]::new($t))",
].join('; ')

// True from a fresh start or /clear until the first prompt: the Resume button's window.
const isFresh = atom({ plugin: 'handoff-buttons', key: 'isFresh' } as const, false)
// When the main loop's last reply finished, which is when the cache was last read; 0 before the first.
const lastReplyAt = atom({ plugin: 'handoff-buttons', key: 'lastReplyAt' } as const, 0)
// 'asked' from the handoff button's press, 'done' once that reply finishes (the Clear button's window), '' otherwise.
const handoffStep = atom({ plugin: 'handoff-buttons', key: 'handoff' } as const, '' as '' | 'asked' | 'done')
// The session's transcript, from the last classic.SessionStart (a /clear starts a new one); '' when there is none.
const transcriptPath = atom({ plugin: 'handoff-buttons', key: 'transcript' } as const, '')
// How long the cache lasts, as the main loop's last cache write shows it.
const cacheMs = atom({ plugin: 'handoff-buttons', key: 'cacheMs' } as const, HOUR_MS)

let ticking = false // module-level on purpose: a reload starts it again
let alarm: { cancel: () => void } | undefined // the pending 10-minutes-left alarm, set after each main-loop reply
let webhook = '' // the discordWebhook option; a change in settings reloads the module with the new one

type Engine = Parameters<Hook<'turn.complete'>>[0]

// The newest main-loop entry that wrote cache decides.
// ponytail: $.fs.read refuses files over 4 MiB, which then fall back to the hour; none in two weeks was that big
async function readCacheMs($: Engine) {
  const path = await read($, transcriptPath)
  const text = path ? await $.fs.read(path).catch(() => '') : ''
  for (const line of text.split('\n').reverse()) {
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    const written = entry.type === 'assistant' && !entry.isSidechain ? entry.message?.usage?.cache_creation : undefined
    if (written?.ephemeral_5m_input_tokens > 0) {
      return FIVE_MIN_MS
    }
    if (written?.ephemeral_1h_input_tokens > 0) {
      return HOUR_MS
    }
  }
  return HOUR_MS
}

// Whether a main-loop reply in this session's transcript is a handoff, however it was asked for: the button, /session-handoff, or plain words.
// A /clear starts a new transcript, so the next session starts without one. An unreadable transcript counts as none.
async function hasHandoff($: Engine) {
  const path = await read($, transcriptPath)
  const text = path ? await $.fs.read(path).catch(() => '') : ''
  for (const line of text.split('\n')) {
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    const content = entry.type === 'assistant' && !entry.isSidechain ? entry.message?.content : undefined
    if (Array.isArray(content) && content.some(b => b?.type === 'text' && HANDOFF_MARKER.test(String(b.text ?? '')))) {
      return true
    }
  }
  return false
}

// Whether the main loop's newest reply with text is a handoff: that turn wrote one, so Clear is safe, as after the button.
async function lastReplyIsHandoff($: Engine) {
  const path = await read($, transcriptPath)
  const text = path ? await $.fs.read(path).catch(() => '') : ''
  for (const line of text.split('\n').reverse()) {
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    const content = entry.type === 'assistant' && !entry.isSidechain ? entry.message?.content : undefined
    const texts = Array.isArray(content) ? content.filter(b => b?.type === 'text') : []
    if (texts.length) {
      return texts.some(b => HANDOFF_MARKER.test(String(b.text ?? '')))
    }
  }
  return false
}

// A session the phone started has its Remote Control id only in the desktop app's record of it, beside the app's copy of Claude Code.
// ponytail: that record is the app's own bookkeeping; if an update moves it, phone-started posts lose their link again
async function desktopBridgeId($: Engine) {
  const exec = await $.env.get('CLAUDE_CODE_EXECPATH').catch(() => undefined)
  const account = await $.env.get('CLAUDE_CODE_ACCOUNT_UUID').catch(() => undefined)
  const org = await $.env.get('CLAUDE_CODE_ORGANIZATION_UUID').catch(() => undefined)
  const host = await $.env.get('CLAUDE_CODE_HOST_SESSION_ID').catch(() => undefined)
  const root = exec?.split('\\claude-code\\')[0]
  if (!root || root === exec || !account || !org || !host) {
    return ''
  }
  const text = await $.fs.read(`${root}\\claude-code-sessions\\${account}\\${org}\\${host}.json`).catch(() => '')
  try {
    return String(JSON.parse(text).bridgeSessionIds?.at(-1) ?? '')
  } catch {
    return ''
  }
}

// The Discord text: the session's newest name, and its Remote Control link, which the phone app opens. Either is left out when neither the transcript nor the desktop app has one.
// The link's id is the Remote Control record's, `cse_` swapped for `session_`.
async function discordText($: Engine) {
  const path = await read($, transcriptPath)
  const text = path ? await $.fs.read(path).catch(() => '') : ''
  let title = ''
  let id = ''
  for (const line of text.split('\n')) {
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    if (entry.type === 'custom-title' && entry.customTitle) {
      title = entry.customTitle
    }
    if (entry.type === 'bridge-session' && entry.bridgeSessionId) {
      id = String(entry.bridgeSessionId)
    }
  }
  id ||= await desktopBridgeId($)
  const link = id ? `\n<https://claude.ai/code/${id.replace(/^cse_/, 'session_')}>` : '' // <> stops Discord's preview card
  return `${title ? `**${title}**: ` : ''}${ALARM}${link}`
}

// From the time the cache was last read: the alarm at 10 minutes left (none if that has passed), and the redraw tick.
// A 5-minute window is all inside the last 10 minutes, so it never sets one: the alarm would come with every reply.
async function startCacheClock($: Engine, repliedAt: number) {
  alarm?.cancel()
  const wait = repliedAt + await read($, cacheMs) - COOLING_MS - await $.clock.now()
  alarm = wait <= 0 ? undefined : $.clock.after(wait, async () => {
    // Same bar as the cooling handoff button, and not once this session has a handoff, even with work since.
    if (((await $.session.usage()).context.tokens ?? 0) < COOLING_HANDOFF_TOKENS || await read($, handoffStep) !== '' || await hasHandoff($)) {
      return
    }
    $.ui.toast(ALARM, { timeoutMs: 60_000 }) // the longest a toast may stay; the red line and the Windows card outlast it
    const sent = await $.ui.notify(ALARM).catch(() => ({ isSent: false }))
    if (!sent.isSent) {
      await $.process.run(['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', WINDOWS_CARD]).catch(() => undefined)
    }
    // A phone push for when the screen is off: standby files the Windows card silently. Reaches Discord only while the PC stays online.
    if (webhook) {
      await $.http.fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: await discordText($) }) }).catch(() => undefined)
    }
  })
  // Redraw while idle so the minutes left keep moving.
  if (!ticking) {
    ticking = true
    $.clock.every(30_000, () => $.ui.invalidate('ui.render'))
  }
}

export const register: Register = (on, options) => {
  webhook = String(options.discordWebhook ?? '')
  on('classic.SessionStart', async ($, e, next) => {
    if (e.source === 'startup' || e.source === 'clear') {
      await update($, isFresh, () => true)
      await update($, lastReplyAt, () => 0)
      await update($, handoffStep, () => '')
    }
    await update($, transcriptPath, () => e.transcript_path)
    const ttl = await readCacheMs($)
    await update($, cacheMs, () => ttl)
    // A reopened session forgets the button's step, so the transcript says whether its last reply was a handoff.
    if (await lastReplyIsHandoff($)) {
      await update($, handoffStep, () => 'done')
    }
    // A reopened session is a new process that has seen no reply, but Claude Code says how long ago the last one was.
    if (e.seconds_since_last_response !== undefined) {
      const repliedAt = await $.clock.now() - e.seconds_since_last_response * 1000
      await update($, lastReplyAt, () => repliedAt)
      await startCacheClock($, repliedAt)
    }
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    alarm?.cancel() // a new prompt reads the cache again, so the clock starts over at the reply
    await update($, isFresh, () => false)
    // Typing on after a handoff makes Clear unsafe: it would throw away the newer work.
    await update($, handoffStep, h => h === 'done' ? '' : h)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (!e.agentId) {
      const now = await $.clock.now()
      const ttl = await readCacheMs($)
      await update($, lastReplyAt, () => now)
      await update($, cacheMs, () => ttl)
      const handedOff = await lastReplyIsHandoff($) // /session-handoff or plain words, not only the button
      await update($, handoffStep, h => h === 'asked' || handedOff ? 'done' : h)
      await startCacheClock($, now)
    }
    return r
  })

  // Installing or updating the mod reloads it in every open session, which drops the alarm but keeps the last reply's time.
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    const repliedAt = await read($, lastReplyAt)
    if (repliedAt > 0) {
      await startCacheClock($, repliedAt)
    }
    return r
  })

  // The strip below replaces the written warning, so drop that hook's note before the model reads it.
  on('prompt.attachment', async ($, e, next) => {
    const isWarning = e.origin.kind === 'hook' && e.origin.event === 'UserPromptSubmit' && e.text.includes(WARNING_PREFIX)
    return isWarning ? { text: null } : next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const { Box, Button, Text } = $.ui.resolve(e)

    // The status line always shows; the cache part only once a reply has read the cache.
    const usage = await $.session.usage()
    const tokens = usage.context.tokens ?? 0
    const now = await $.clock.now()
    const resetIn = (at?: string) => {
      const m = at ? Math.max(0, Math.ceil((Date.parse(at) - now) / 60_000)) : NaN
      return Number.isNaN(m) ? '' : ` (resets in ${Math.floor(m / 60)}h ${m % 60}m)`
    }
    const limits = usage.rateLimits.map(l => `${LIMIT_LABEL[l.kind] ?? l.kind} ${Math.round(l.percentUsed)}%${l.kind === 'five_hour' ? resetIn(l.resetsAt) : ''}`).join(' · ')
    const repliedAt = await read($, lastReplyAt)
    const known = repliedAt > 0 || e.props.isWorking
    const ttl = await read($, cacheMs)
    const left = !known || e.props.isWorking ? ttl : ttl - (now - repliedAt)
    const cooling = known && left > 0 && left <= COOLING_MS
    const coolingHandoff = cooling && ttl > COOLING_MS // a 5-minute window cools from the start, so a handoff saves nothing there
    const mins = Math.ceil(left / 60_000)
    const line = (
      <Box>
        {!known ? null
          : left > COOLING_MS ? <Text color="green">{`● cache warm ${mins}m`}</Text>
          : cooling ? <Text color="red">{`◐ cache expires in ${mins}m`}</Text>
          : <Text dimColor>○ cache expired</Text>}
        <Text dimColor>{`${known ? ' │ ' : ''}context ${Math.round(tokens / 1000)}k${limits ? ` │ ${limits}` : ''}`}</Text>
      </Box>
    )

    if (await read($, isFresh)) {
      return (
        <Box flexDirection="column" width="100%">
          {line}
          <Box>
            <Text dimColor>Pick up from the last handoff? </Text>
            <Button key="resume" label="Resume" onPress={() => $.command.run({ command: 'session-handoff:resume-work' })} />
          </Box>
        </Box>
      )
    }

    const step = await read($, handoffStep)
    const offerHandoff = step === '' && (tokens >= THRESHOLD_TOKENS || (coolingHandoff && tokens >= COOLING_HANDOFF_TOKENS))
    const handoff = (
      <Box width="100%" justifyContent="space-between">
        <Text color="yellow">{coolingHandoff ? 'Hand off now to resume cheaply later. ' : `Context at ${Math.floor(tokens / 1000)}k — time to hand off. `}</Text>
        <Button key="handoff" label="Session handoff" onPress={async () => {
          await update($, handoffStep, () => 'asked') // before the run: its reply may finish before the run resolves
          await $.command.run({ command: 'session-handoff:session-handoff', args: 'write a handoff' })
        }} />
      </Box>
    )
    const clear = (
      <Box width="100%" justifyContent="space-between">
        <Text color="green">Handoff written. Start fresh? </Text>
        <Button key="clear" label="Clear" onPress={() => $.command.run({ command: 'clear' })} />
      </Box>
    )
    return (
      <Box flexDirection="column" width="100%">
        {line}
        {step === 'done' && !e.props.isWorking ? clear : offerHandoff ? handoff : null}
      </Box>
    )
  })
}
