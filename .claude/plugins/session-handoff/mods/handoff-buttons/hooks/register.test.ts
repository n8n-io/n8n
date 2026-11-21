import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'handoff-buttons',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

// Stand-ins for the engine beneath the plugin: a fixed token count, and recorders for what the buttons and the alarm send.
// The notification channel answers as the desktop app does (nothing sent) unless notifySent.
function engine(on: any, tokens: number, rateLimits: { kind: string, percentUsed: number, resetsAt?: string }[] = [], notifySent = false) {
  const sent = { prompts: [] as string[], commands: [] as string[], args: [] as string[], toasts: [] as string[], notes: [] as string[], runs: [] as string[][], posts: [] as any[] }
  on('http.fetch', (_$: any, e: any) => { sent.posts.push(e); return { value: { status: 204, ok: true, headers: {}, text: '' } } })
  on('ui.toast', (_$: any, e: any) => { sent.toasts.push(e.text); return { value: undefined } })
  on('ui.notify', (_$: any, e: any) => { sent.notes.push(e.text); return { value: notifySent ? { isSent: true, channel: 'iterm2' } : { isSent: false, reason: 'no-surface' } } })
  on('process.run', (_$: any, e: any) => { sent.runs.push([...e.argv]); return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } })
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens, window: 200_000 }, rateLimits } }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.render', ($: any, e: any) => h($.ui.resolve(e).Box, {}))
  on('prompt.submit', (_$: any, e: any) => { sent.prompts.push(e.text); return { text: e.text } })
  on('command.run', (_$: any, e: any) => { sent.commands.push(e.command); sent.args.push(e.args); return {} })
  on('classic.SessionStart', () => ({}))
  on('session.start', () => ({ cwd: '' }))
  return sent
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: nothing under 150k`, async ($, on) => {
    mock.clock(on, { now: 1_000_000 })
    engine(on, 149_999)
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ key: 'handoff' })).toBeUndefined()
    expect(await ui.find({ key: 'resume' })).toBeUndefined()
  })

  test(`${surface}: handoff button at 150k runs the skill`, async ($, on) => {
    mock.clock(on, { now: 1_000_000 })
    const sent = engine(on, 150_000)
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /150k/ }))).toBeDefined()
    await ui.press({ key: 'handoff' })
    expect(sent.commands).toEqual(['session-handoff:session-handoff'])
    expect(sent.args).toEqual(['write a handoff'])
    expect(sent.prompts).toEqual([])
  })

  test(`${surface}: clear button once the handoff reply is done`, async ($, on) => {
    mock.clock(on, { now: 1_000_000 })
    const sent = engine(on, 160_000)
    await $.turn.complete(reply())
    await (await $.ui.mount({ ...BAND, surface })).press({ key: 'handoff' })
    const writing = await $.ui.mount({ ...BAND, surface })
    expect(await writing.find({ key: 'clear' })).toBeUndefined()
    await $.turn.complete(reply())
    const busy = await $.ui.mount({ ...BAND, surface, props: { ...BAND.props, isWorking: true } })
    expect(await busy.find({ key: 'clear' })).toBeUndefined()
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ key: 'handoff' })).toBeUndefined()
    await ui.press({ key: 'clear' })
    expect(sent.commands).toEqual(['session-handoff:session-handoff', 'clear'])
  })

  test(`${surface}: clear button goes when the person types on`, async ($, on) => {
    mock.clock(on, { now: 1_000_000 })
    engine(on, 160_000)
    await $.turn.complete(reply())
    await (await $.ui.mount({ ...BAND, surface })).press({ key: 'handoff' })
    await $.turn.complete(reply())
    expect(await (await $.ui.mount({ ...BAND, surface })).find({ key: 'clear' })).toBeDefined()
    await $.prompt.submit({ text: 'one more thing' })
    expect(await (await $.ui.mount({ ...BAND, surface })).find({ key: 'clear' })).toBeUndefined()
  })

  test(`${surface}: a handoff cut short by /clear does not bring up clear later`, async ($, on) => {
    mock.clock(on, { now: 1_000_000 })
    engine(on, 160_000)
    await $.turn.complete(reply())
    await (await $.ui.mount({ ...BAND, surface })).press({ key: 'handoff' })
    await $.classic.SessionStart({ source: 'clear' })
    await $.prompt.submit({ text: 'hi' })
    await $.turn.complete(reply())
    expect(await (await $.ui.mount({ ...BAND, surface })).find({ key: 'clear' })).toBeUndefined()
  })

  test(`${surface}: a subagent finishing does not bring up clear`, async ($, on) => {
    mock.clock(on, { now: 1_000_000 })
    engine(on, 160_000)
    await $.turn.complete(reply())
    await (await $.ui.mount({ ...BAND, surface })).press({ key: 'handoff' })
    await $.turn.complete(reply('agent-1'))
    expect(await (await $.ui.mount({ ...BAND, surface })).find({ key: 'clear' })).toBeUndefined()
  })

  test(`${surface}: resume button on a fresh start, gone after the first prompt`, async ($, on) => {
    mock.clock(on, { now: 1_000_000 })
    const sent = engine(on, 0)
    await $.classic.SessionStart({ source: 'startup' })
    const ui = await $.ui.mount({ ...BAND, surface })
    await ui.press({ key: 'resume' })
    expect(sent.commands).toEqual(['session-handoff:resume-work'])
    await $.prompt.submit({ text: 'hi' })
    const after = await $.ui.mount({ ...BAND, surface })
    expect(await after.find({ key: 'resume' })).toBeUndefined()
  })

  test(`${surface}: fresh start shows context and plan use above the resume button`, async ($, on) => {
    mock.clock(on, { now: 1_000_000 })
    engine(on, 90_000, [{ kind: 'five_hour', percentUsed: 34 }])
    await $.classic.SessionStart({ source: 'startup' })
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /context 90k │ 5h 34%/ })).toBeDefined()
    expect(await ui.find({ key: 'resume' })).toBeDefined()
  })

  test(`${surface}: before the first reply the line shows without a cache state`, async ($, on) => {
    mock.clock(on, { now: 1_000_000 })
    engine(on, 50_000, [{ kind: 'five_hour', percentUsed: 34 }])
    await $.classic.SessionStart({ source: 'resume' })
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /context 50k │ 5h 34%/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /cache/ })).toBeUndefined()
  })

  test(`${surface}: no resume button on a resumed conversation`, async ($, on) => {
    mock.clock(on, { now: 1_000_000 })
    engine(on, 0)
    await $.classic.SessionStart({ source: 'resume' })
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ key: 'resume' })).toBeUndefined()
  })
}

const MIN = 60_000
const reply = (agentId?: string) => ({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' as const, ...(agentId ? { agentId } : {}) })

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: cache line shows time left, context and plan use`, async ($, on) => {
    const clock = mock.clock(on, { now: 1_000_000 })
    engine(on, 50_000, [{ kind: 'five_hour', percentUsed: 34 }, { kind: 'seven_day', percentUsed: 12 }])
    await $.turn.complete(reply())
    await clock.advance(18 * MIN)
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /cache warm 42m/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /context 50k/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /5h 34% · week 12%/ })).toBeDefined()
    expect(await ui.find({ key: 'handoff' })).toBeUndefined()
  })

  test(`${surface}: 5h use shows the time until it resets`, async ($, on) => {
    const clock = mock.clock(on, { now: 1_000_000 })
    const resetsAt = new Date(1_000_000 + 152 * MIN).toISOString()
    engine(on, 50_000, [{ kind: 'five_hour', percentUsed: 34, resetsAt }, { kind: 'seven_day', percentUsed: 12, resetsAt }])
    await $.turn.complete(reply())
    await clock.advance(18 * MIN)
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /5h 34% \(resets in 2h 14m\) · week 12%/ })).toBeDefined()
  })

  test(`${surface}: last 10 minutes over 100k offers the handoff`, async ($, on) => {
    const clock = mock.clock(on, { now: 1_000_000 })
    const sent = engine(on, 105_000)
    await $.turn.complete(reply())
    await clock.advance(52 * MIN)
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /cache expires in 8m/ }))?.props.color).toBe('red')
    await ui.press({ key: 'handoff' })
    expect(sent.commands).toEqual(['session-handoff:session-handoff'])
  })

  test(`${surface}: last 10 minutes under 100k shows no button`, async ($, on) => {
    const clock = mock.clock(on, { now: 1_000_000 })
    engine(on, 99_999)
    await $.turn.complete(reply())
    await clock.advance(52 * MIN)
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /cache expires in 8m/ })).toBeDefined()
    expect(await ui.find({ key: 'handoff' })).toBeUndefined()
  })

  test(`${surface}: expired cache keeps the button over 150k only`, async ($, on) => {
    const clock = mock.clock(on, { now: 1_000_000 })
    engine(on, 140_000)
    await $.turn.complete(reply())
    await clock.advance(61 * MIN)
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /cache expired/ })).toBeDefined()
    expect(await ui.find({ key: 'handoff' })).toBeUndefined()
  })

  test(`${surface}: expired cache over 150k still offers the handoff`, async ($, on) => {
    const clock = mock.clock(on, { now: 1_000_000 })
    engine(on, 160_000)
    await $.turn.complete(reply())
    await clock.advance(61 * MIN)
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /cache expired/ })).toBeDefined()
    expect(await ui.find({ key: 'handoff' })).toBeDefined()
  })
}

test('subagent turns and /clear do not count as a reply', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  engine(on, 50_000)
  await $.turn.complete(reply('agent-1'))
  expect(await (await $.ui.mount({ ...BAND, surface: 'terminal' })).find({ type: 'Text', text: /cache/ })).toBeUndefined()
  await $.turn.complete(reply())
  await clock.advance(MIN)
  await $.classic.SessionStart({ source: 'clear' })
  await $.prompt.submit({ text: 'hi' })
  expect(await (await $.ui.mount({ ...BAND, surface: 'terminal' })).find({ type: 'Text', text: /cache/ })).toBeUndefined()
})

test('the cache line counts down on its own', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  engine(on, 50_000)
  await $.turn.complete(reply())
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /cache warm 60m/ })).toBeDefined()
  await clock.advance(30 * MIN)
  expect(await ui.find({ type: 'Text', text: /cache warm 30m/ })).toBeDefined()
})

const ALARM = 'Cache expires in 10m. Hand off now to resume cheaply later.'

test('alarm at 10 minutes left over 100k: a pop-up and a Windows card', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const sent = engine(on, 105_000)
  await $.turn.complete(reply())
  await clock.advance(49 * MIN)
  expect(sent.toasts).toEqual([])
  await clock.advance(MIN)
  expect(sent.toasts).toEqual([ALARM])
  expect(sent.notes).toEqual([ALARM])
  expect(sent.runs.length).toBe(1)
  expect(sent.runs[0]?.[0]).toBe('powershell.exe')
  await clock.advance(20 * MIN)
  expect(sent.toasts.length).toBe(1)
})

test('alarm also posts to the Discord webhook when one is set', { options: { discordWebhook: 'https://discord.test/hook' } }, async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const sent = engine(on, 105_000)
  await $.turn.complete(reply())
  await clock.advance(49 * MIN)
  expect(sent.posts).toEqual([])
  await clock.advance(MIN)
  expect(sent.posts.length).toBe(1)
  expect(sent.posts[0].url).toBe('https://discord.test/hook')
  expect(sent.posts[0].init.method).toBe('POST')
  expect(sent.posts[0].init.headers['Content-Type']).toBe('application/json')
  expect(JSON.parse(sent.posts[0].init.body)).toEqual({ content: ALARM })
  expect(sent.runs.length).toBe(1) // the Windows card still comes
})

test('no PowerShell card when the notification channel already sent one', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const sent = engine(on, 105_000, [], true)
  await $.turn.complete(reply())
  await clock.advance(50 * MIN)
  expect(sent.notes).toEqual([ALARM])
  expect(sent.runs).toEqual([])
})

test('no alarm under 100k', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const sent = engine(on, 99_999)
  await $.turn.complete(reply())
  await clock.advance(55 * MIN)
  expect(sent.toasts).toEqual([])
})

test('a new prompt puts the alarm off until the next reply', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const sent = engine(on, 105_000)
  await $.turn.complete(reply())
  await clock.advance(30 * MIN)
  await $.prompt.submit({ text: 'one more thing' })
  await clock.advance(30 * MIN)
  expect(sent.toasts).toEqual([])
  await $.turn.complete(reply())
  await clock.advance(49 * MIN)
  expect(sent.toasts).toEqual([])
  await clock.advance(MIN)
  expect(sent.toasts).toEqual([ALARM])
})

test('no alarm once the handoff is written', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const sent = engine(on, 160_000)
  await $.turn.complete(reply())
  await (await $.ui.mount({ ...BAND, surface: 'terminal' })).press({ key: 'handoff' })
  await $.turn.complete(reply())
  await clock.advance(50 * MIN)
  expect(sent.toasts).toEqual([])
})

// A reopened session is a new process that has seen no reply; Claude Code says how long ago the last one was.
for (const surface of ['terminal', 'desktop'] as const) {
  for (const [ago, shown, color] of [[26, /cache warm 34m/, 'green'], [54, /cache expires in 6m/, 'red'], [120, /cache expired/, undefined]] as const) {
    test(`${surface}: reopened ${ago}m after the last reply shows the cache at once`, async ($, on) => {
      mock.clock(on, { now: 10_000_000 })
      engine(on, 160_000)
      await $.classic.SessionStart({ source: 'resume', seconds_since_last_response: ago * 60 })
      const found = await (await $.ui.mount({ ...BAND, surface })).find({ type: 'Text', text: shown })
      expect(found).toBeDefined()
      expect(found?.props.color).toBe(color)
    })
  }
}

test('reopened with time left: the alarm still comes at 10 minutes left', async ($, on) => {
  const clock = mock.clock(on, { now: 10_000_000 })
  const sent = engine(on, 105_000)
  await $.classic.SessionStart({ source: 'resume', seconds_since_last_response: 20 * 60 })
  await clock.advance(29 * MIN)
  expect(sent.toasts).toEqual([])
  await clock.advance(MIN)
  expect(sent.toasts).toEqual([ALARM])
})

test('reopened inside the last 10 minutes: no late alarm', async ($, on) => {
  const clock = mock.clock(on, { now: 10_000_000 })
  const sent = engine(on, 105_000)
  await $.classic.SessionStart({ source: 'resume', seconds_since_last_response: 55 * 60 })
  await clock.advance(10 * MIN)
  expect(sent.toasts).toEqual([])
})

test('reopened: the cache line counts down on its own', async ($, on) => {
  const clock = mock.clock(on, { now: 10_000_000 })
  engine(on, 50_000)
  await $.classic.SessionStart({ source: 'resume', seconds_since_last_response: 10 * 60 })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /cache warm 50m/ })).toBeDefined()
  await clock.advance(20 * MIN)
  expect(await ui.find({ type: 'Text', text: /cache warm 30m/ })).toBeDefined()
})

// Installing or updating the mod reloads it in every open session: the alarm is dropped, the last reply's time is kept.
test('a reload sets the alarm again from the last reply', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const sent = engine(on, 105_000)
  on('state.get', (_$: any, e: any, next: any) => e.key === 'lastReplyAt' ? { value: { value: 1_000_000, version: 1 } } : next(e))
  await $.session.start({ cwd: '', surface: 'terminal', isInteractive: true })
  await clock.advance(50 * MIN)
  expect(sent.toasts).toEqual([ALARM])
})

// The transcript says which cache window the main loop's last write used. Lines are read newest last.
const cached = (m5: number, h1: number, isSidechain = false) => JSON.stringify({
  type: 'assistant', isSidechain, message: { usage: { cache_creation: { ephemeral_5m_input_tokens: m5, ephemeral_1h_input_tokens: h1 } } },
})
function transcript(on: any, lines: () => string[] | undefined) {
  on('fs.read', (_$: any, e: any) => {
    const l = e.path.endsWith('T.jsonl') ? lines() : undefined
    if (!l) {
      throw new Error('ENOENT')
    }
    return { value: l.join('\n') + '\n' }
  })
}

test('a 5-minute cache: the line counts down from 5, with no alarm and no cooling button', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const sent = engine(on, 105_000)
  // Newest first: a subagent's write and a write-nothing reply are skipped, so the 5-minute write decides.
  transcript(on, () => [cached(0, 900), cached(400, 0), cached(0, 0), cached(0, 700, true)])
  await $.classic.SessionStart({ source: 'resume', transcript_path: 'T.jsonl' })
  await $.turn.complete(reply())
  await clock.advance(MIN)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /cache expires in 4m/ })).toBeDefined()
  expect(await ui.find({ key: 'handoff' })).toBeUndefined()
  await clock.advance(5 * MIN)
  expect(await ui.find({ type: 'Text', text: /cache expired/ })).toBeDefined()
  await clock.advance(60 * MIN)
  expect(sent.toasts).toEqual([])
  expect(sent.runs).toEqual([])
})

test('back on the 1-hour cache, the alarm returns', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const sent = engine(on, 105_000)
  let lines = [cached(400, 0)]
  transcript(on, () => lines)
  await $.classic.SessionStart({ source: 'resume', transcript_path: 'T.jsonl' })
  await $.turn.complete(reply())
  await clock.advance(60 * MIN)
  expect(sent.toasts).toEqual([])
  lines = [...lines, cached(0, 900)]
  await $.prompt.submit({ text: 'back under the limit' })
  await $.turn.complete(reply())
  expect(await (await $.ui.mount({ ...BAND, surface: 'terminal' })).find({ type: 'Text', text: /cache warm 60m/ })).toBeDefined()
  await clock.advance(50 * MIN)
  expect(sent.toasts).toEqual([ALARM])
})

test('reopened on a 5-minute cache: the line uses it at once', async ($, on) => {
  mock.clock(on, { now: 10_000_000 })
  engine(on, 50_000)
  transcript(on, () => [cached(400, 0)])
  await $.classic.SessionStart({ source: 'resume', transcript_path: 'T.jsonl', seconds_since_last_response: 2 * 60 })
  expect(await (await $.ui.mount({ ...BAND, surface: 'terminal' })).find({ type: 'Text', text: /cache expires in 3m/ })).toBeDefined()
})

// A handoff reply in the transcript, as session-handoff prints it: the memory-dir marker first.
const handedOff = (isSidechain = false) => JSON.stringify({
  type: 'assistant', isSidechain, message: { content: [{ type: 'text', text: '<!-- handoff-memory-dir: C:/memory -->\n# Session Handoff — Fix the parser' }] },
})

test('no alarm after a handoff asked for in words, not the button', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const sent = engine(on, 160_000)
  transcript(on, () => [cached(0, 900), handedOff()])
  await $.classic.SessionStart({ source: 'resume', transcript_path: 'T.jsonl' })
  await $.turn.complete(reply())
  await clock.advance(50 * MIN)
  expect(sent.toasts).toEqual([])
  expect(sent.runs).toEqual([])
})

test('no alarm, Discord included, when work goes on after a handoff', { options: { discordWebhook: 'https://discord.test/hook' } }, async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const sent = engine(on, 160_000)
  const lines = [cached(0, 900)]
  transcript(on, () => lines)
  await $.classic.SessionStart({ source: 'resume', transcript_path: 'T.jsonl' })
  await $.turn.complete(reply())
  await (await $.ui.mount({ ...BAND, surface: 'terminal' })).press({ key: 'handoff' })
  lines.push(handedOff())
  await $.turn.complete(reply())
  await $.prompt.submit({ text: 'one more thing' })
  lines.push(said('Done.'), cached(0, 900))
  await $.turn.complete(reply())
  await clock.advance(50 * MIN)
  expect(sent.toasts).toEqual([])
  expect(sent.posts).toEqual([])
})

test('a subagent quoting the marker is not a handoff', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const sent = engine(on, 160_000)
  transcript(on, () => [cached(0, 900), handedOff(true)])
  await $.classic.SessionStart({ source: 'resume', transcript_path: 'T.jsonl' })
  await $.turn.complete(reply())
  await clock.advance(50 * MIN)
  expect(sent.toasts).toEqual([ALARM])
})

// An ordinary main-loop reply with text, for work after a handoff.
const said = (text: string) => JSON.stringify({ type: 'assistant', isSidechain: false, message: { content: [{ type: 'text', text }] } })

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: a handoff asked for without the button brings up clear`, async ($, on) => {
    mock.clock(on, { now: 1_000_000 })
    const sent = engine(on, 160_000)
    transcript(on, () => [said('Stopping at a natural break.'), handedOff()])
    await $.classic.SessionStart({ source: 'resume', transcript_path: 'T.jsonl' })
    await $.prompt.submit({ text: '/session-handoff' })
    await $.turn.complete(reply())
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ key: 'handoff' })).toBeUndefined()
    await ui.press({ key: 'clear' })
    expect(sent.commands).toEqual(['clear'])
  })

  test(`${surface}: a reply after a handoff does not bring clear back`, async ($, on) => {
    mock.clock(on, { now: 1_000_000 })
    engine(on, 160_000)
    transcript(on, () => [handedOff(), said('Done, the parser is fixed.')])
    await $.classic.SessionStart({ source: 'resume', transcript_path: 'T.jsonl' })
    await $.prompt.submit({ text: 'one more thing' })
    await $.turn.complete(reply())
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ key: 'clear' })).toBeUndefined()
    expect(await ui.find({ key: 'handoff' })).toBeDefined()
  })

  test(`${surface}: reopened after a handoff shows clear, not the handoff button`, async ($, on) => {
    mock.clock(on, { now: 10_000_000 })
    engine(on, 160_000)
    transcript(on, () => [said('Stopping at a natural break.'), handedOff()])
    await $.classic.SessionStart({ source: 'resume', transcript_path: 'T.jsonl', seconds_since_last_response: 120 * 60 })
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ key: 'handoff' })).toBeUndefined()
    expect(await ui.find({ key: 'clear' })).toBeDefined()
  })

  test(`${surface}: reopened with work after the handoff offers the handoff again`, async ($, on) => {
    mock.clock(on, { now: 10_000_000 })
    engine(on, 160_000)
    transcript(on, () => [handedOff(), said('Done, the parser is fixed.')])
    await $.classic.SessionStart({ source: 'resume', transcript_path: 'T.jsonl', seconds_since_last_response: 120 * 60 })
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ key: 'clear' })).toBeUndefined()
    expect(await ui.find({ key: 'handoff' })).toBeDefined()
  })

  test(`${surface}: a subagent quoting the marker does not bring up clear`, async ($, on) => {
    mock.clock(on, { now: 1_000_000 })
    engine(on, 160_000)
    transcript(on, () => [said('Here is what I found.'), handedOff(true)])
    await $.classic.SessionStart({ source: 'resume', transcript_path: 'T.jsonl' })
    await $.prompt.submit({ text: 'look into it' })
    await $.turn.complete(reply())
    expect(await (await $.ui.mount({ ...BAND, surface })).find({ key: 'clear' })).toBeUndefined()
  })
}

test('after /clear the new session alarms again', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const sent = engine(on, 160_000)
  transcript(on, () => [cached(0, 900), handedOff()])
  await $.classic.SessionStart({ source: 'resume', transcript_path: 'T.jsonl' })
  await $.classic.SessionStart({ source: 'clear', transcript_path: 'New.jsonl' })
  await $.prompt.submit({ text: 'hi' })
  await $.turn.complete(reply())
  await clock.advance(50 * MIN)
  expect(sent.toasts).toEqual([ALARM])
})

// The Discord post names the session and links it for the phone app, from the newest title and Remote Control records.
const titled = (customTitle: string) => JSON.stringify({ type: 'custom-title', customTitle })
const bridged = (bridgeSessionId: string) => JSON.stringify({ type: 'bridge-session', bridgeSessionId })

test('the Discord post carries the session name and its phone link', { options: { discordWebhook: 'https://discord.test/hook' } }, async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const sent = engine(on, 105_000)
  transcript(on, () => [titled('Old name'), bridged('cse_OLD'), cached(0, 900), titled('Fix the parser'), bridged('cse_01ABC')])
  await $.classic.SessionStart({ source: 'resume', transcript_path: 'T.jsonl' })
  await $.turn.complete(reply())
  await clock.advance(50 * MIN)
  expect(JSON.parse(sent.posts[0].init.body)).toEqual({ content: `**Fix the parser**: ${ALARM}\n<https://claude.ai/code/session_01ABC>` })
  expect(sent.toasts).toEqual([ALARM]) // the pop-up on the PC stays as it was
})

test('no Remote Control record: the Discord post has the name and no link', { options: { discordWebhook: 'https://discord.test/hook' } }, async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const sent = engine(on, 105_000)
  transcript(on, () => [cached(0, 900), titled('Fix the parser')])
  await $.classic.SessionStart({ source: 'resume', transcript_path: 'T.jsonl' })
  await $.turn.complete(reply())
  await clock.advance(50 * MIN)
  expect(JSON.parse(sent.posts[0].init.body)).toEqual({ content: `**Fix the parser**: ${ALARM}` })
})

// A session started from the phone has no Remote Control record in its transcript; the desktop app's own record of it has the id.
const DESKTOP_ENV: Record<string, string> = {
  CLAUDE_CODE_EXECPATH: 'C:\\AppData\\Claude-Data\\claude_x\\claude-code\\2.1.308\\abc\\claude.exe',
  CLAUDE_CODE_ACCOUNT_UUID: 'acct',
  CLAUDE_CODE_ORGANIZATION_UUID: 'org',
  CLAUDE_CODE_HOST_SESSION_ID: 'local_s1',
}
const DESKTOP_RECORD = 'C:\\AppData\\Claude-Data\\claude_x\\claude-code-sessions\\acct\\org\\local_s1.json'

test('started from the phone: the Discord link comes from the desktop app\'s record', { options: { discordWebhook: 'https://discord.test/hook' } }, async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const sent = engine(on, 105_000)
  on('env.get', (_$: any, e: any) => ({ value: DESKTOP_ENV[e.name] }))
  on('fs.read', (_$: any, e: any) => {
    if (e.path === DESKTOP_RECORD) {
      return { value: JSON.stringify({ bridgeSessionIds: ['cse_OLD', 'cse_01PHONE'] }) }
    }
    if (e.path.endsWith('T.jsonl')) {
      return { value: [cached(0, 900), titled('Fix the parser')].join('\n') + '\n' }
    }
    throw new Error('ENOENT')
  })
  await $.classic.SessionStart({ source: 'resume', transcript_path: 'T.jsonl' })
  await $.turn.complete(reply())
  await clock.advance(50 * MIN)
  expect(JSON.parse(sent.posts[0].init.body)).toEqual({ content: `**Fix the parser**: ${ALARM}\n<https://claude.ai/code/session_01PHONE>` })
})

test('an unreadable transcript falls back to the hour', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const sent = engine(on, 105_000)
  transcript(on, () => undefined)
  await $.classic.SessionStart({ source: 'resume', transcript_path: 'T.jsonl' })
  await $.turn.complete(reply())
  expect(await (await $.ui.mount({ ...BAND, surface: 'terminal' })).find({ type: 'Text', text: /cache warm 60m/ })).toBeDefined()
  await clock.advance(50 * MIN)
  expect(sent.toasts).toEqual([ALARM])
})

test('drops only the written context warning', async ($, on) => {
  on('prompt.attachment', (_$: any, e: any) => ({ text: e.text }))
  const hook = { kind: 'hook', event: 'UserPromptSubmit' } as const
  const warning = await $.prompt.attachment({ type: 'hook_success', text: 'UserPromptSubmit hook success: [CONTEXT WARNING] Context is at 130k', origin: hook })
  const other = await $.prompt.attachment({ type: 'hook_success', text: 'UserPromptSubmit hook success: [PROSE STYLE] ...', origin: hook })
  expect(warning.text).toBeNull()
  expect(other.text).toBe('UserPromptSubmit hook success: [PROSE STYLE] ...')
})
