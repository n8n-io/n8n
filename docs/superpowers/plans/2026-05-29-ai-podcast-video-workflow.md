# AI Podcast Video Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new importable n8n workflow that uses the user's Volcengine speech service `10028` / AppID `2152902662` AI podcast capability to generate podcast audio, then reuses the existing video composer to produce the edited MP4.

**Architecture:** Keep `workflows/video-clip-tts-workflow.json` stable. Add a new workflow file plus focused local helpers under `tools/video-composer/` that turn a user viewpoint into an AI podcast request, save `audio.mp3`, normalize native timing or fail into configured subtitle alignment, then pass the existing `audioPath` and `ttsTimingPath` contract into `compose-video.mjs`.

**Tech Stack:** n8n workflow JSON, Node.js ESM, `node:test`, WebSocket over Node 25 built-in `WebSocket`, `ffmpeg`, `ffprobe`, existing `compose-video.mjs`.

---

## File Structure

- Create `tools/video-composer/ai-podcast-utils.mjs`: pure helpers for env resolution, request building, frame decoding, timing normalization, and subtitle fallback gating.
- Create `tools/video-composer/ai-podcast-utils.test.mjs`: unit tests for the pure helpers.
- Create `tools/video-composer/ai-podcast-client.mjs`: CLI that reads a job JSON, calls the AI podcast WebSocket service, writes audio/timing/metadata files, and exits non-zero on unusable subtitles.
- Create `tools/video-composer/ai-podcast-client.test.mjs`: tests for CLI job validation and offline frame handling without real network.
- Create `workflows/video-clip-ai-podcast-workflow.json`: importable n8n workflow for the AI podcast path.
- Modify `.env.video-clip.example`: add `DOUBAO_AI_PODCAST_*` and optional subtitle fallback variables.
- Modify `docs/video-clip-tts-workflow.md`: document the new workflow as a sibling to the stable TTS workflow.

## Task 1: AI Podcast Utility Contract

**Files:**
- Create: `tools/video-composer/ai-podcast-utils.mjs`
- Create: `tools/video-composer/ai-podcast-utils.test.mjs`

- [ ] **Step 1: Write utility tests**

Create `tools/video-composer/ai-podcast-utils.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import {
	buildAiPodcastRequest,
	buildEnvConfig,
	decodeJsonFrame,
	extractAudioChunks,
	normalizeNativeTiming,
	requireSubtitleTiming,
} from './ai-podcast-utils.mjs';

test('buildEnvConfig defaults to speech service 10028', () => {
	const config = buildEnvConfig({
		DOUBAO_AI_PODCAST_API_KEY: 'key',
		DOUBAO_AI_PODCAST_APP_KEY: 'app-key',
	});

	assert.equal(config.url, 'wss://openspeech.bytedance.com/api/v3/sami/podcasttts');
	assert.equal(config.appId, '2152902662');
	assert.equal(config.resourceId, 'volc.service_type.10028');
	assert.equal(config.apiKey, 'key');
	assert.equal(config.appKey, 'app-key');
});

test('buildEnvConfig rejects missing required credentials', () => {
	assert.throws(
		() => buildEnvConfig({ DOUBAO_AI_PODCAST_API_KEY: 'key' }),
		/Missing required AI podcast env var: DOUBAO_AI_PODCAST_APP_KEY/,
	);
});

test('buildAiPodcastRequest keeps the podcast brief as input_text', () => {
	const request = buildAiPodcastRequest({
		jobId: 'job-1',
		inputText: '今天我们要聊的话题是 AI 播客。',
		speakerA: 'zh_male_dayi_v2_saturn_bigtts',
		speakerB: 'zh_female_mizai_v2_saturn_bigtts',
		useHeadMusic: false,
	});

	assert.equal(request.input_id, 'job-1');
	assert.equal(request.input_text, '今天我们要聊的话题是 AI 播客。');
	assert.equal(request.use_head_music, false);
	assert.deepEqual(request.speaker_info, [
		{ speaker: 'zh_male_dayi_v2_saturn_bigtts', role: 'A' },
		{ speaker: 'zh_female_mizai_v2_saturn_bigtts', role: 'B' },
	]);
});

test('decodeJsonFrame supports text and binary JSON frames', () => {
	assert.deepEqual(decodeJsonFrame('{"event":"done"}'), { event: 'done' });
	assert.deepEqual(decodeJsonFrame(Buffer.from('{"event":"audio"}')), { event: 'audio' });
	assert.equal(decodeJsonFrame(Buffer.from([0, 1, 2])), null);
});

test('extractAudioChunks accepts common base64 audio fields', () => {
	const chunks = extractAudioChunks([
		{ audio: 'YQ==' },
		{ data: { audio: 'Yg==' } },
		{ result: { audio: 'Yw==' } },
	]);

	assert.deepEqual(chunks.map((chunk) => chunk.toString('utf8')), ['a', 'b', 'c']);
});

test('normalizeNativeTiming turns words into composer timing frames', () => {
	const timing = normalizeNativeTiming([
		{
			sentence: {
				words: [
					{ word: '今', startTime: 0, endTime: 0.2 },
					{ word: '天', startTime: 0.2, endTime: 0.4 },
				],
			},
		},
	]);

	assert.equal(timing.source, 'podcast_native');
	assert.deepEqual(timing.frames[0].sentence.words[0], {
		word: '今',
		startTime: 0,
		endTime: 0.2,
	});
});

test('requireSubtitleTiming fails clearly without native timing or fallback', () => {
	assert.throws(
		() => requireSubtitleTiming({ frames: [], source: 'podcast_native' }, { fallback: 'none' }),
		/AI podcast service did not return usable timestamps/,
	);
});
```

- [ ] **Step 2: Run utility tests and confirm failure**

Run:

```bash
node --test tools/video-composer/ai-podcast-utils.test.mjs
```

Expected: FAIL because `tools/video-composer/ai-podcast-utils.mjs` does not exist.

- [ ] **Step 3: Implement utility helpers**

Create `tools/video-composer/ai-podcast-utils.mjs`:

```js
import { TextDecoder } from 'node:util';

const decoder = new TextDecoder();

export function buildEnvConfig(env = process.env) {
	const config = {
		url: env.DOUBAO_AI_PODCAST_URL || 'wss://openspeech.bytedance.com/api/v3/sami/podcasttts',
		apiKey: env.DOUBAO_AI_PODCAST_API_KEY || '',
		appId: env.DOUBAO_AI_PODCAST_APP_ID || '2152902662',
		appKey: env.DOUBAO_AI_PODCAST_APP_KEY || '',
		resourceId: env.DOUBAO_AI_PODCAST_RESOURCE_ID || 'volc.service_type.10028',
		speakerA: env.DOUBAO_AI_PODCAST_SPEAKER_A || 'zh_male_dayi_v2_saturn_bigtts',
		speakerB: env.DOUBAO_AI_PODCAST_SPEAKER_B || 'zh_female_mizai_v2_saturn_bigtts',
		subtitleFallback: env.VIDEO_CLIP_SUBTITLE_FALLBACK || 'none',
	};

	for (const [name, value] of [
		['DOUBAO_AI_PODCAST_API_KEY', config.apiKey],
		['DOUBAO_AI_PODCAST_APP_KEY', config.appKey],
	]) {
		if (!value) throw new Error(`Missing required AI podcast env var: ${name}`);
	}

	return config;
}

export function buildAiPodcastRequest({
	jobId,
	inputText,
	speakerA,
	speakerB,
	useHeadMusic = false,
}) {
	return {
		input_id: String(jobId),
		input_text: String(inputText || '').trim(),
		action: 'submit',
		use_head_music: Boolean(useHeadMusic),
		audio_config: {
			format: 'mp3',
			sample_rate: 24000,
		},
		speaker_info: [
			{ speaker: speakerA, role: 'A' },
			{ speaker: speakerB, role: 'B' },
		],
	};
}

export function decodeJsonFrame(frame) {
	try {
		const text = typeof frame === 'string' ? frame : decoder.decode(frame);
		const start = text.indexOf('{');
		const end = text.lastIndexOf('}');
		if (start < 0 || end < start) return null;
		return JSON.parse(text.slice(start, end + 1));
	} catch {
		return null;
	}
}

function pickAudioBase64(frame) {
	for (const value of [
		frame?.audio,
		frame?.data,
		frame?.data?.audio,
		frame?.result?.audio,
		frame?.result?.data,
	]) {
		if (typeof value === 'string' && value.trim()) return value.trim();
	}

	return '';
}

export function extractAudioChunks(frames) {
	return frames
		.map(pickAudioBase64)
		.filter(Boolean)
		.map((chunk) => Buffer.from(chunk, 'base64'));
}

function normalizeWord(raw) {
	const text = raw?.word ?? raw?.text ?? raw?.token ?? raw?.content;
	const start = raw?.startTime ?? raw?.start_time ?? raw?.start ?? raw?.beginTime ?? raw?.begin_time;
	const end = raw?.endTime ?? raw?.end_time ?? raw?.end ?? raw?.stopTime ?? raw?.stop_time;
	if (!text || !Number.isFinite(Number(start)) || !Number.isFinite(Number(end))) return null;

	return {
		word: String(text),
		startTime: Number(start) > 100 ? Number(start) / 1000 : Number(start),
		endTime: Number(end) > 100 ? Number(end) / 1000 : Number(end),
	};
}

export function normalizeNativeTiming(frames) {
	const normalizedFrames = [];
	for (const frame of Array.isArray(frames) ? frames : []) {
		const sentence = frame?.sentence ?? frame?.data?.sentence ?? frame?.result?.sentence ?? frame;
		const words = [sentence?.words, sentence?.word_timestamps, sentence?.timestamps]
			.find(Array.isArray);
		if (!words) continue;
		const normalizedWords = words.map(normalizeWord).filter(Boolean);
		if (normalizedWords.length > 0) normalizedFrames.push({ sentence: { words: normalizedWords } });
	}

	return {
		source: 'podcast_native',
		frames: normalizedFrames,
	};
}

export function requireSubtitleTiming(timing, { fallback = 'none' } = {}) {
	if (Array.isArray(timing?.frames) && timing.frames.length > 0) return timing;
	if (fallback && fallback !== 'none') return timing;

	throw new Error(
		'AI podcast service did not return usable timestamps and no subtitle alignment fallback is configured.',
	);
}
```

- [ ] **Step 4: Run utility tests and confirm pass**

Run:

```bash
node --test tools/video-composer/ai-podcast-utils.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit utility contract**

```bash
git add tools/video-composer/ai-podcast-utils.mjs tools/video-composer/ai-podcast-utils.test.mjs
git commit -m "feat: add ai podcast utility helpers"
```

## Task 2: AI Podcast Client CLI

**Files:**
- Create: `tools/video-composer/ai-podcast-client.mjs`
- Create: `tools/video-composer/ai-podcast-client.test.mjs`

- [ ] **Step 1: Write CLI tests for offline mode and job validation**

Create `tools/video-composer/ai-podcast-client.test.mjs`:

```js
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const clientPath = new URL('./ai-podcast-client.mjs', import.meta.url).pathname;

function makeJob(extra = {}) {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-podcast-client-'));
	const job = {
		jobId: 'job-1',
		podcastInputText: '今天我们要聊的话题是测试。',
		ttsDir: path.join(tmp, 'tts'),
		audioPath: path.join(tmp, 'tts', 'audio.mp3'),
		ttsTimingPath: path.join(tmp, 'tts', 'timing.json'),
		podcastMetadataPath: path.join(tmp, 'tts', 'ai-podcast-metadata.json'),
		podcastRawResponsePath: path.join(tmp, 'tts', 'ai-podcast-response.binlog'),
		...extra,
	};
	const jobPath = path.join(tmp, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify(job, null, 2));
	return { tmp, job, jobPath };
}

test('client fails clearly when credentials are missing', () => {
	const { jobPath } = makeJob();
	const result = spawnSync('node', [clientPath, jobPath], {
		encoding: 'utf8',
		env: { PATH: process.env.PATH },
	});

	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /Missing required AI podcast env var/);
});

test('client can consume offline fixture frames and write audio plus timing', () => {
	const { jobPath, job } = makeJob();
	const fixturePath = path.join(path.dirname(jobPath), 'frames.json');
	fs.writeFileSync(fixturePath, JSON.stringify([
		{ audio: Buffer.from('audio').toString('base64') },
		{ sentence: { words: [{ word: '测', startTime: 0, endTime: 0.2 }] } },
	]));

	const result = spawnSync('node', [clientPath, jobPath], {
		encoding: 'utf8',
		env: {
			...process.env,
			DOUBAO_AI_PODCAST_API_KEY: 'key',
			DOUBAO_AI_PODCAST_APP_KEY: 'app-key',
			AI_PODCAST_FIXTURE_FRAMES: fixturePath,
		},
	});

	assert.equal(result.status, 0, result.stderr);
	assert.equal(fs.readFileSync(job.audioPath, 'utf8'), 'audio');
	const timing = JSON.parse(fs.readFileSync(job.ttsTimingPath, 'utf8'));
	assert.equal(timing.source, 'podcast_native');
	assert.equal(timing.frames.length, 1);
});
```

- [ ] **Step 2: Run CLI tests and confirm failure**

Run:

```bash
node --test tools/video-composer/ai-podcast-client.test.mjs
```

Expected: FAIL because the client CLI does not exist.

- [ ] **Step 3: Implement the CLI**

Create `tools/video-composer/ai-podcast-client.mjs`:

```js
#!/usr/bin/env node
import fs from 'node:fs';

import {
	buildAiPodcastRequest,
	buildEnvConfig,
	decodeJsonFrame,
	extractAudioChunks,
	normalizeNativeTiming,
	requireSubtitleTiming,
} from './ai-podcast-utils.mjs';

function usage() {
	console.error('Usage: node tools/video-composer/ai-podcast-client.mjs JOB_JSON_PATH');
	process.exit(1);
}

function loadJob(jobPath) {
	if (!jobPath) usage();
	const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
	for (const field of [
		'jobId',
		'podcastInputText',
		'ttsDir',
		'audioPath',
		'ttsTimingPath',
		'podcastMetadataPath',
		'podcastRawResponsePath',
	]) {
		if (!job[field]) throw new Error(`AI podcast job missing field: ${field}`);
	}
	return job;
}

async function collectFramesWithWebSocket(config, request, job) {
	const frames = [];
	const rawChunks = [];
	const headers = {
		'X-Api-App-Id': config.appId,
		'X-Api-Access-Key': config.apiKey,
		'X-Api-App-Key': config.appKey,
		'X-Api-Resource-Id': config.resourceId,
		'X-Api-Request-Id': job.jobId,
	};

	const socket = new WebSocket(config.url, { headers });
	await new Promise((resolve, reject) => {
		const timeout = setTimeout(() => reject(new Error('AI podcast WebSocket timed out')), 180000);
		socket.addEventListener('open', () => socket.send(JSON.stringify(request)));
		socket.addEventListener('message', async (event) => {
			const data = Buffer.from(await event.data.arrayBuffer?.() ?? event.data);
			rawChunks.push(data);
			const frame = decodeJsonFrame(data);
			if (frame) frames.push(frame);
			if (frame?.event === 'done' || frame?.event === 'completed') socket.close();
		});
		socket.addEventListener('error', () => reject(new Error('AI podcast WebSocket connection failed')));
		socket.addEventListener('close', () => {
			clearTimeout(timeout);
			resolve();
		});
	});

	return { frames, rawChunks };
}

async function main() {
	const job = loadJob(process.argv[2]);
	fs.mkdirSync(job.ttsDir, { recursive: true });
	const config = buildEnvConfig(process.env);
	const request = buildAiPodcastRequest({
		jobId: job.jobId,
		inputText: job.podcastInputText,
		speakerA: job.podcastSpeakerA || config.speakerA,
		speakerB: job.podcastSpeakerB || config.speakerB,
		useHeadMusic: job.useHeadMusic,
	});

	let frames;
	let rawChunks;
	if (process.env.AI_PODCAST_FIXTURE_FRAMES) {
		frames = JSON.parse(fs.readFileSync(process.env.AI_PODCAST_FIXTURE_FRAMES, 'utf8'));
		rawChunks = frames.map((frame) => Buffer.from(JSON.stringify(frame)));
	} else {
		({ frames, rawChunks } = await collectFramesWithWebSocket(config, request, job));
	}

	fs.writeFileSync(job.podcastRawResponsePath, Buffer.concat(rawChunks));
	fs.writeFileSync(job.podcastMetadataPath, JSON.stringify({
		request: { ...request, input_text: request.input_text.slice(0, 2000) },
		resourceId: config.resourceId,
		frameCount: frames.length,
	}, null, 2));

	const audioChunks = extractAudioChunks(frames);
	if (audioChunks.length === 0) throw new Error('AI podcast service returned no audio chunks');
	fs.writeFileSync(job.audioPath, Buffer.concat(audioChunks));

	const timing = requireSubtitleTiming(normalizeNativeTiming(frames), {
		fallback: config.subtitleFallback,
	});
	fs.writeFileSync(job.ttsTimingPath, JSON.stringify(timing, null, 2), 'utf8');

	console.log(JSON.stringify({
		ok: true,
		audioPath: job.audioPath,
		ttsTimingPath: job.ttsTimingPath,
		subtitleSource: timing.source,
	}));
}

main().catch((error) => {
	console.error(error.stack || error.message);
	process.exit(1);
});
```

- [ ] **Step 4: Run CLI tests and confirm pass**

Run:

```bash
node --test tools/video-composer/ai-podcast-client.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit client CLI**

```bash
git add tools/video-composer/ai-podcast-client.mjs tools/video-composer/ai-podcast-client.test.mjs
git commit -m "feat: add ai podcast client"
```

## Task 3: Environment And Documentation

**Files:**
- Modify: `.env.video-clip.example`
- Modify: `docs/video-clip-tts-workflow.md`

- [ ] **Step 1: Add AI podcast env template**

Add this block to `.env.video-clip.example` after the ordinary TTS block:

```bash
# Doubao/Volcengine AI podcast service 10028.
DOUBAO_AI_PODCAST_URL=wss://openspeech.bytedance.com/api/v3/sami/podcasttts
DOUBAO_AI_PODCAST_API_KEY=
DOUBAO_AI_PODCAST_APP_ID=2152902662
DOUBAO_AI_PODCAST_APP_KEY=
DOUBAO_AI_PODCAST_RESOURCE_ID=volc.service_type.10028
DOUBAO_AI_PODCAST_SPEAKER_A=zh_male_dayi_v2_saturn_bigtts
DOUBAO_AI_PODCAST_SPEAKER_B=zh_female_mizai_v2_saturn_bigtts
VIDEO_CLIP_SUBTITLE_FALLBACK=none
```

- [ ] **Step 2: Document the sibling workflow**

Add this section to `docs/video-clip-tts-workflow.md` after the `Files` section:

```md
## AI Podcast Sibling Workflow

The stable workflow remains `workflows/video-clip-tts-workflow.json`.

The AI podcast version is `workflows/video-clip-ai-podcast-workflow.json`. It uses the Volcengine speech console service `10028` with AppID `2152902662` through `DOUBAO_AI_PODCAST_*` env vars. It keeps the same cover, screenshot, background video, and composer behavior, but replaces segmented TTS with AI podcast audio.

The AI podcast workflow requires native timestamps from the service or a configured subtitle alignment fallback. It fails clearly instead of generating an unsubtitled video when no timing source is available.
```

- [ ] **Step 3: Run docs diff check**

Run:

```bash
git diff --check -- .env.video-clip.example docs/video-clip-tts-workflow.md
```

Expected: no output.

- [ ] **Step 4: Commit env and docs**

```bash
git add .env.video-clip.example docs/video-clip-tts-workflow.md
git commit -m "docs: document ai podcast workflow env"
```

## Task 4: New Importable AI Podcast Workflow

**Files:**
- Create: `workflows/video-clip-ai-podcast-workflow.json`

- [ ] **Step 1: Generate workflow from the stable workflow shape**

Create `workflows/video-clip-ai-podcast-workflow.json` by copying the stable workflow structure and changing:

- Workflow name to `MVP - AI Podcast Video Clip Composer`
- Form path to `video-clip-ai-podcast-upload`
- Replace old `script_mode`, `voice_single`, `voice_a`, `voice_b`, and `script_style` fields with `podcast_speaker_a`, `podcast_speaker_b`, `podcast_style`, and `use_head_music`
- Replace the segmented TTS nodes with a Code node that builds an AI podcast job and a Code node that runs `tools/video-composer/ai-podcast-client.mjs`
- Preserve `Build Job Config`, `Run Composer Script`, `Verify Final Video`, and `Respond With Result`

The AI podcast client Code node should contain:

```js
const { spawnSync } = require('child_process');
const item = $input.first().json;
const scriptPath = `${item.repoDir}/tools/video-composer/ai-podcast-client.mjs`;
const result = spawnSync('node', [scriptPath, item.aiPodcastJobPath], {
  cwd: item.repoDir,
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 20,
});
if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(`AI podcast client failed with exit code ${result.status}: ${result.stderr || result.stdout}`);
}
const audio = require('fs').readFileSync(item.audioPath);
const podcastAudio = await this.helpers.prepareBinaryData(audio, 'ai-podcast-audio.mp3', 'audio/mpeg');
return [{ json: { ...item, aiPodcastStdout: result.stdout }, binary: { podcastAudio } }];
```

- [ ] **Step 2: Parse workflow JSON and Code nodes**

Run:

```bash
node - <<'NODE'
const fs = require('fs');
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const workflow = JSON.parse(fs.readFileSync('workflows/video-clip-ai-podcast-workflow.json', 'utf8'));
for (const node of workflow.nodes) {
  const code = node.parameters?.jsCode;
  if (code) new AsyncFunction('$input', '$env', '$', 'require', code);
}
console.log('ai podcast workflow parsed');
NODE
```

Expected: `ai podcast workflow parsed`.

- [ ] **Step 3: Commit workflow**

```bash
git add workflows/video-clip-ai-podcast-workflow.json
git commit -m "feat: add ai podcast video workflow"
```

## Task 5: Verification

**Files:**
- Test: `tools/video-composer/ai-podcast-utils.test.mjs`
- Test: `tools/video-composer/ai-podcast-client.test.mjs`
- Test: `tools/video-composer/compose-video.test.mjs`
- Verify: `workflows/video-clip-ai-podcast-workflow.json`

- [ ] **Step 1: Run unit tests**

Run:

```bash
node --test tools/video-composer/ai-podcast-utils.test.mjs
node --test tools/video-composer/ai-podcast-client.test.mjs
node --test tools/video-composer/compose-video.test.mjs
```

Expected: all pass.

- [ ] **Step 2: Run whitespace checks**

Run:

```bash
git diff --check -- \
  .env.video-clip.example \
  docs/video-clip-tts-workflow.md \
  tools/video-composer/ai-podcast-utils.mjs \
  tools/video-composer/ai-podcast-utils.test.mjs \
  tools/video-composer/ai-podcast-client.mjs \
  tools/video-composer/ai-podcast-client.test.mjs \
  workflows/video-clip-ai-podcast-workflow.json
```

Expected: no output.

- [ ] **Step 3: Runtime validation gate**

Check whether the local env contains AI podcast credentials:

```bash
set -a; source .env.video-clip; set +a
node - <<'NODE'
for (const key of ['DOUBAO_AI_PODCAST_API_KEY', 'DOUBAO_AI_PODCAST_APP_KEY']) {
  console.log(`${key}: ${process.env[key] ? 'present' : 'missing'}`);
}
NODE
```

Expected before live validation: both are `present`.

- [ ] **Step 4: Import and run the new workflow**

Use the existing n8n local runtime after credentials are present. Submit the same sample visual assets used by the stable workflow to:

```text
http://localhost:5678/form/video-clip-ai-podcast-upload
```

Expected:

- `tts/audio.mp3` exists
- `tts/timing.json` has native or fallback subtitle events
- `render/final.mp4` exists
- final video duration follows AI podcast audio duration

- [ ] **Step 5: Commit verification notes if docs changed**

If the runtime validation reveals corrected endpoint, resource ID, or response-frame details, update `docs/video-clip-tts-workflow.md` and commit:

```bash
git add docs/video-clip-tts-workflow.md
git commit -m "docs: record ai podcast workflow validation"
```

## Self-Review

- Spec coverage: The plan covers the new workflow, service `10028` envs, AI podcast WebSocket client, native timestamp normalization, subtitle-fallback gating, existing composer reuse, and validation.
- Placeholder scan: No TBD/TODO placeholders are used. Fallback is explicitly gated rather than pretending alignment is available without credentials or local tooling.
- Type consistency: The plan consistently uses `DOUBAO_AI_PODCAST_*`, `ai-podcast-client.mjs`, `audioPath`, `ttsTimingPath`, `aiPodcastJobPath`, and `workflows/video-clip-ai-podcast-workflow.json`.
