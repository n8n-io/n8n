# Podcast Voice Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing video clip workflow so dialogue-mode scripts sound like a mature podcast interview and the form exposes only the focused MVP voice set with Chinese labels.

**Architecture:** Keep the current workflow JSON shape and TTS/video pipeline. Update the script-writer skill to produce host/guest podcast dialogue, update shared voice utilities, then regenerate the inlined utility copies inside the n8n workflow Code nodes.

**Tech Stack:** n8n workflow JSON, Node.js ESM utilities, n8n Code nodes, Doubao/Volcengine `seed-tts-2.0`, FFmpeg.

---

## File Structure

- Modify `tools/video-composer/script-writer/SKILL.md`: tighten dialogue prompt into podcast interview format based on the ShotFlow reference skill while preserving the existing strict JSON schema.
- Modify `tools/video-composer/workflow-utils.mjs`: replace broad voice presets with the MVP podcast voice set and add normalization for Chinese dropdown labels.
- Modify `tools/video-composer/workflow-utils.test.mjs`: cover new voice keys, Chinese label normalization, and dialogue script constraints that must remain parseable.
- Modify `workflows/video-clip-tts-workflow.json`: update dropdown options, defaults, and inlined workflow utilities.
- Modify `docs/video-clip-tts-workflow.md`: document the narrowed podcast voice list and Chinese labels.

## Task 1: Voice Preset Unit Tests

**Files:**
- Modify: `tools/video-composer/workflow-utils.test.mjs`

- [ ] **Step 1: Add tests for MVP voice keys and Chinese option normalization**

Add a test block near the existing `resolveVoicePreset returns official speaker ids` test:

```js
test('resolveVoicePreset supports MVP podcast voices and Chinese dropdown labels', () => {
	assert.equal(
		VOICE_PRESETS.host_male_wennuanahu.speaker,
		'zh_male_wennuanahu_uranus_bigtts',
	);
	assert.equal(resolveVoicePreset('host_male_liufei').speaker, 'zh_male_liufei_uranus_bigtts');
	assert.equal(resolveVoicePreset('guest_male_yuanboxiaoshu').speaker, 'zh_male_yuanboxiaoshu_uranus_bigtts');
	assert.equal(resolveVoicePreset('guest_female_tina').speaker, 'zh_female_yingyujiaoxue_uranus_bigtts');
	assert.equal(resolveVoicePreset('男主持 - 温柔阿虎｜host_male_wennuanahu').speaker, 'zh_male_wennuanahu_uranus_bigtts');
	assert.equal(resolveVoicePreset('女嘉宾 - Tina 老师｜guest_female_tina').speaker, 'zh_female_yingyujiaoxue_uranus_bigtts');
});
```

- [ ] **Step 2: Update existing voice expectations**

Change the single narration test input from:

```js
{ voiceSingle: 'xiaohe' }
```

to:

```js
{ voiceSingle: 'host_male_wennuanahu' }
```

and change expected speaker to:

```js
speaker: 'zh_male_wennuanahu_uranus_bigtts'
```

Change the dialogue test input to:

```js
{ voiceA: 'host_male_wennuanahu', voiceB: 'guest_female_tina' }
```

and expected speakers to:

```js
assert.equal(segments[0].speaker, 'zh_male_wennuanahu_uranus_bigtts');
assert.equal(segments[1].speaker, 'zh_female_yingyujiaoxue_uranus_bigtts');
```

- [ ] **Step 3: Run tests to verify they fail before implementation**

Run:

```bash
node --test tools/video-composer/workflow-utils.test.mjs
```

Expected: FAIL because the new voice keys and Chinese label normalization are not implemented yet.

## Task 2: Voice Preset Implementation

**Files:**
- Modify: `tools/video-composer/workflow-utils.mjs`
- Test: `tools/video-composer/workflow-utils.test.mjs`

- [ ] **Step 1: Replace `VOICE_PRESETS` with the MVP podcast set**

Use this exact object:

```js
export const VOICE_PRESETS = {
	host_male_wennuanahu: {
		speaker: 'zh_male_wennuanahu_uranus_bigtts',
		label: '男主持 - 温柔阿虎',
	},
	host_male_liufei: {
		speaker: 'zh_male_liufei_uranus_bigtts',
		label: '男主持 - 刘飞',
	},
	host_male_yuanboxiaoshu: {
		speaker: 'zh_male_yuanboxiaoshu_uranus_bigtts',
		label: '男主持 - 渊博小叔',
	},
	host_female_tina: {
		speaker: 'zh_female_yingyujiaoxue_uranus_bigtts',
		label: '女主持 - Tina 老师',
	},
	guest_female_xiaohe: {
		speaker: 'zh_female_xiaohe_uranus_bigtts',
		label: '女嘉宾 - 小何',
	},
	guest_female_tina: {
		speaker: 'zh_female_yingyujiaoxue_uranus_bigtts',
		label: '女嘉宾 - Tina 老师',
	},
	guest_male_liufei: {
		speaker: 'zh_male_liufei_uranus_bigtts',
		label: '男嘉宾 - 刘飞',
	},
	guest_male_yuanboxiaoshu: {
		speaker: 'zh_male_yuanboxiaoshu_uranus_bigtts',
		label: '男嘉宾 - 渊博小叔',
	},
};
```

- [ ] **Step 2: Add dropdown value normalization**

Add this helper before `resolveVoicePreset`:

```js
export function normalizeVoicePresetKey(value) {
	const text = String(value ?? '').trim();
	if (!text) return '';
	const separatorIndex = text.lastIndexOf('｜');
	return separatorIndex >= 0 ? text.slice(separatorIndex + 1).trim() : text;
}
```

Update `resolveVoicePreset` to use it:

```js
export function resolveVoicePreset(key, fallbackSpeaker = '') {
	const normalized = normalizeVoicePresetKey(key);
	if (!normalized && fallbackSpeaker) {
		return { speaker: fallbackSpeaker, label: 'fallback' };
	}

	const preset = VOICE_PRESETS[normalized];
	if (!preset) {
		throw new Error(`Unknown voice preset: ${normalized || '(empty)'}`);
	}

	return preset;
}
```

- [ ] **Step 3: Run utility tests**

Run:

```bash
node --test tools/video-composer/workflow-utils.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Commit utility changes**

```bash
git add tools/video-composer/workflow-utils.mjs tools/video-composer/workflow-utils.test.mjs
git commit -m "feat: add podcast voice presets"
```

## Task 3: Podcast Script Writer Prompt

**Files:**
- Modify: `tools/video-composer/script-writer/SKILL.md`

- [ ] **Step 1: Update purpose and inputs**

Change the purpose from generic short-video script writing to viewpoint-to-podcast script writing. Keep `mode`, `title`, `summary`, and `segments` as the only required output fields.

Required text to include in the skill:

```md
In `dialogue` mode, write a podcast-style host/guest conversation. Role `A` is the host who frames the topic, guides the structure, and asks follow-up questions. Role `B` is the guest or listener proxy who reacts naturally, asks for examples, raises realistic objections, and adds grounded explanations.
```

- [ ] **Step 2: Add the internal reasoning chain**

Add this section:

```md
## Podcast Reasoning Chain

Before writing the script, internally transform the user's viewpoint into:

1. thesis: the core claim in one arguable sentence.
2. audience pain: why listeners care, misunderstand, or resist the claim.
3. argument map: 2-3 support points with examples, analogies, or consequences.
4. objection: at least one realistic listener concern.
5. takeaway: one memorable closing point.

Do not output this reasoning chain. Only output the strict JSON schema.
```

- [ ] **Step 3: Replace dialogue rules**

The dialogue rules must include:

```md
- `mode` must be `dialogue`.
- Use only `role: "A"` and `role: "B"`.
- `A` is Host. `B` is Guest/listener proxy.
- Produce 8-12 segments.
- Each segment should be 30-90 Chinese characters.
- The first `A` segment must be a natural podcast opening. It can use topic setup, listener pain, a concrete scene, or a mild counterintuitive hook. Do not force one fixed sentence.
- Include at least one concrete objection or listener concern.
- Do not include stage directions, Markdown, sound effects, URLs, speaker labels inside text, or bracketed actions.
- Keep wording conversational and TTS-friendly. A little `啊`, `嗯`, `其实`, `简单来说`, `那就是说` is acceptable when natural.
```

- [ ] **Step 4: Run a prompt syntax sanity check**

Run:

```bash
rg -n "Podcast Reasoning Chain|natural podcast opening|role: \"A\"" tools/video-composer/script-writer/SKILL.md
```

Expected: all three phrases are present.

- [ ] **Step 5: Commit prompt changes**

```bash
git add tools/video-composer/script-writer/SKILL.md
git commit -m "feat: make generated scripts podcast-style"
```

## Task 4: Workflow Dropdowns And Inline Utilities

**Files:**
- Modify: `workflows/video-clip-tts-workflow.json`

- [ ] **Step 1: Update form dropdown options**

Set `voice_single` options to:

```json
[
  { "option": "男主持 - 温柔阿虎｜host_male_wennuanahu" },
  { "option": "男主持 - 刘飞｜host_male_liufei" },
  { "option": "男主持 - 渊博小叔｜host_male_yuanboxiaoshu" },
  { "option": "女主持 - Tina 老师｜host_female_tina" },
  { "option": "女嘉宾 - 小何｜guest_female_xiaohe" }
]
```

Set `voice_a` default to:

```json
"男主持 - 温柔阿虎｜host_male_wennuanahu"
```

Set `voice_a` options to the host voices:

```json
[
  { "option": "男主持 - 温柔阿虎｜host_male_wennuanahu" },
  { "option": "男主持 - 刘飞｜host_male_liufei" },
  { "option": "男主持 - 渊博小叔｜host_male_yuanboxiaoshu" },
  { "option": "女主持 - Tina 老师｜host_female_tina" }
]
```

Set `voice_b` default to:

```json
"女嘉宾 - 小何｜guest_female_xiaohe"
```

Set `voice_b` options to:

```json
[
  { "option": "女嘉宾 - 小何｜guest_female_xiaohe" },
  { "option": "女嘉宾 - Tina 老师｜guest_female_tina" },
  { "option": "男嘉宾 - 刘飞｜guest_male_liufei" },
  { "option": "男嘉宾 - 渊博小叔｜guest_male_yuanboxiaoshu" }
]
```

- [ ] **Step 2: Update default selected voices inside `Save Uploaded Files`**

Change:

```js
voiceSingle: item.json.voice_single || 'xiaohe',
voiceA: item.json.voice_a || 'yunzhou',
voiceB: item.json.voice_b || 'xiaohe'
```

to:

```js
voiceSingle: item.json.voice_single || '男主持 - 温柔阿虎｜host_male_wennuanahu',
voiceA: item.json.voice_a || '男主持 - 温柔阿虎｜host_male_wennuanahu',
voiceB: item.json.voice_b || '女嘉宾 - 小何｜guest_female_xiaohe'
```

- [ ] **Step 3: Refresh inlined utility blocks**

Regenerate the inlined `VOICE_PRESETS`, `normalizeVoicePresetKey`, and `resolveVoicePreset` code in both workflow Code nodes that include utility code:

- `Parse Generated Script`
- `Synthesize And Merge TTS Segments`

The inlined definitions must match `tools/video-composer/workflow-utils.mjs`.

- [ ] **Step 4: Validate workflow JSON and Code nodes**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('workflows/video-clip-tts-workflow.json','utf8')); console.log('workflow json ok')"
node - <<'NODE'
const fs = require('fs');
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const wf = JSON.parse(fs.readFileSync('workflows/video-clip-tts-workflow.json','utf8'));
for (const n of wf.nodes.filter(n => n.type === 'n8n-nodes-base.code')) new AsyncFunction(n.parameters.jsCode);
console.log('code nodes parse ok');
NODE
```

Expected:

```text
workflow json ok
code nodes parse ok
```

- [ ] **Step 5: Commit workflow changes**

```bash
git add workflows/video-clip-tts-workflow.json
git commit -m "feat: expose podcast voices in workflow"
```

## Task 5: Documentation

**Files:**
- Modify: `docs/video-clip-tts-workflow.md`

- [ ] **Step 1: Replace voice table with MVP podcast voice list**

Use this table:

```md
| Display name | Internal key | Speaker ID | Use |
| --- | --- | --- | --- |
| 男主持 - 温柔阿虎 | `host_male_wennuanahu` | `zh_male_wennuanahu_uranus_bigtts` | Default host |
| 男主持 - 刘飞 | `host_male_liufei` | `zh_male_liufei_uranus_bigtts` | Mature male host |
| 男主持 - 渊博小叔 | `host_male_yuanboxiaoshu` | `zh_male_yuanboxiaoshu_uranus_bigtts` | Knowledgeable male host |
| 女主持 - Tina 老师 | `host_female_tina` | `zh_female_yingyujiaoxue_uranus_bigtts` | Female host |
| 女嘉宾 - 小何 | `guest_female_xiaohe` | `zh_female_xiaohe_uranus_bigtts` | Default guest |
| 女嘉宾 - Tina 老师 | `guest_female_tina` | `zh_female_yingyujiaoxue_uranus_bigtts` | Female guest |
| 男嘉宾 - 刘飞 | `guest_male_liufei` | `zh_male_liufei_uranus_bigtts` | Male guest |
| 男嘉宾 - 渊博小叔 | `guest_male_yuanboxiaoshu` | `zh_male_yuanboxiaoshu_uranus_bigtts` | Male guest |
```

- [ ] **Step 2: Document podcast script behavior**

Add a short paragraph:

```md
Dialogue mode generates a host/guest podcast-style script. The first host turn should open like a podcast with a topic setup, listener pain, concrete scene, or light counterintuitive hook. It is not forced to use one fixed opening sentence.
```

- [ ] **Step 3: Commit docs**

```bash
git add docs/video-clip-tts-workflow.md
git commit -m "docs: document podcast voice options"
```

## Task 6: Import And Runtime Acceptance

**Files:**
- No source edits expected.

- [ ] **Step 1: Run static checks**

Run:

```bash
node --test tools/video-composer/workflow-utils.test.mjs
node -e "JSON.parse(require('fs').readFileSync('workflows/video-clip-tts-workflow.json','utf8')); console.log('workflow json ok')"
node - <<'NODE'
const fs = require('fs');
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const wf = JSON.parse(fs.readFileSync('workflows/video-clip-tts-workflow.json','utf8'));
for (const n of wf.nodes.filter(n => n.type === 'n8n-nodes-base.code')) new AsyncFunction(n.parameters.jsCode);
console.log('code nodes parse ok');
NODE
git diff --check -- tools/video-composer/workflow-utils.mjs tools/video-composer/workflow-utils.test.mjs tools/video-composer/script-writer/SKILL.md workflows/video-clip-tts-workflow.json docs/video-clip-tts-workflow.md
```

Expected: all commands succeed.

- [ ] **Step 2: Import workflow**

Run:

```bash
packages/cli/bin/n8n import:workflow --input=workflows/video-clip-tts-workflow.json
packages/cli/bin/n8n update:workflow --id=video-clip-tts-workflow --active=true
```

Expected: workflow imports and activates.

- [ ] **Step 3: Restart n8n**

If port `5678` is occupied by an older local instance, stop it first:

```bash
lsof -nP -iTCP:5678 -sTCP:LISTEN
```

Then start:

```bash
pnpm start
```

Expected: n8n logs `Activated workflow "MVP - Viewpoint TTS Video Clip Composer"`.

- [ ] **Step 4: Submit dialogue form**

Run:

```bash
curl -sS -X POST http://localhost:5678/form/video-clip-tts-upload \
  -F "field-0=@tmp/video-clip-e2e-assets/cover.png;type=image/png" \
  -F "field-1=@tmp/video-clip-e2e-assets/screenshot.png;type=image/png" \
  -F "field-2=@tmp/video-clip-e2e-assets/background.mp4;type=video/mp4" \
  -F "field-3=我想做一个播客访谈式短视频：旧照片不是单纯怀旧，而是让人重新看见家人没有说出口的关心。主持人和嘉宾要自然讨论，有追问、有生活例子、有一点反方质疑，最后温和收束。" \
  -F "field-4=dialogue" \
  -F "field-5=男主持 - 温柔阿虎｜host_male_wennuanahu" \
  -F "field-6=男主持 - 温柔阿虎｜host_male_wennuanahu" \
  -F "field-7=女嘉宾 - Tina 老师｜guest_female_tina" \
  -F "field-8=podcast_interview" \
  -o /tmp/video-workflow-response-podcast.json \
  -w "HTTP_STATUS=%{http_code}\nTOTAL_TIME=%{time_total}\n"
```

Expected: `HTTP_STATUS=200`.

- [ ] **Step 5: Verify output**

Run:

```bash
jq '{ok, jobId, videoPath, audioPath, generatedScriptText}' /tmp/video-workflow-response-podcast.json
JOB="$(jq -r '.jobDir' /tmp/video-workflow-response-podcast.json)"
ls -lh "$JOB/tts/audio.mp3" "$JOB/render/final.mp4" "$JOB/render/subtitles.ass"
printf 'audio=' && ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$JOB/tts/audio.mp3"
printf 'video=' && ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$JOB/render/final.mp4"
find "$JOB/tts/segments" -maxdepth 1 -name '*.mp3' | sort
```

Expected:

- `ok` is `true`.
- Generated script begins with a natural podcast opening.
- There are multiple A/B segment MP3 files.
- Audio and video durations are within 0.1 seconds.

- [ ] **Step 6: Commit final validation note if source changed after import**

No commit is needed if no source files changed during runtime validation.
