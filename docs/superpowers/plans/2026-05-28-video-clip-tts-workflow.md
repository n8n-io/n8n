# Video Clip TTS Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an importable n8n workflow that accepts uploaded cover image, proof screenshot, script text, and background video, then produces a 16:9 edited MP4 with Doubao TTS, subtitles, and a three-stage visual layout.

**Architecture:** n8n handles upload, TTS orchestration, job config creation, command execution, and returning the result. A focused Node.js composer script owns media validation, subtitle generation, FFmpeg filter construction, rendering, and logs. The workflow and script communicate through a stable `job.json` file.

**Tech Stack:** n8n workflow JSON, Node.js ESM, `node:test`, `ffmpeg`, `ffprobe`, ASS subtitles, Doubao/Volcengine TTS over HTTP.

---

## File Structure

- Create: `tools/video-composer/compose-video.mjs`  
  CLI and reusable pure helpers for job validation, script splitting, subtitle writing, FFmpeg command generation, and rendering.
- Create: `tools/video-composer/compose-video.test.mjs`  
  Node unit tests for pure helpers and one optional smoke render test gated by `RUN_VIDEO_COMPOSER_SMOKE=1`.
- Create: `workflows/video-clip-tts-workflow.json`  
  Importable n8n workflow using Form Trigger, Code nodes, HTTP Request, file write/read nodes, Execute Command, and Respond to Webhook/Form.
- Create: `docs/video-clip-tts-workflow.md`  
  Operator instructions for environment variables, import, run, verification, and troubleshooting.
- Modify: `.gitignore`  
  Ignore local brainstorming/session artifacts and repository-local video job output.

The implementation must not modify n8n core packages. This is a repo-local workflow asset plus a local utility script.

---

### Task 1: Add Composer Pure Helpers And Unit Tests

**Files:**
- Create: `tools/video-composer/compose-video.mjs`
- Create: `tools/video-composer/compose-video.test.mjs`

- [ ] **Step 1: Create failing unit tests for script splitting, ASS escaping, and timeline calculation**

Create `tools/video-composer/compose-video.test.mjs` with:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import {
	assEscape,
	buildTimeline,
	splitScriptIntoSubtitleChunks,
	toAssTime,
} from './compose-video.mjs';

test('splitScriptIntoSubtitleChunks keeps Chinese sentences readable', () => {
	const chunks = splitScriptIntoSubtitleChunks(
		'红茶中的茶黄素值得关注。它和现代生活方式对肝脏的影响有关！接下来我们看研究截图。',
	);

	assert.deepEqual(chunks, [
		'红茶中的茶黄素值得关注。',
		'它和现代生活方式对肝脏的影响有关！',
		'接下来我们看研究截图。',
	]);
});

test('splitScriptIntoSubtitleChunks breaks very long text into bounded chunks', () => {
	const chunks = splitScriptIntoSubtitleChunks(
		'这是一段没有明显标点但是很长很长需要被拆分成多条字幕否则画面底部会被文字撑满影响观看体验',
		{ maxChars: 18 },
	);

	assert.equal(chunks.every((chunk) => chunk.length <= 18), true);
	assert.equal(chunks.length > 1, true);
});

test('assEscape escapes characters that are special in ASS dialogue text', () => {
	assert.equal(assEscape('第一行\\n{重点}'), '第一行\\\\N\\{重点\\}');
});

test('toAssTime formats seconds as ASS timestamp', () => {
	assert.equal(toAssTime(0), '0:00:00.00');
	assert.equal(toAssTime(65.348), '0:01:05.35');
	assert.equal(toAssTime(3661.2), '1:01:01.20');
});

test('buildTimeline creates three stages when audio is long enough', () => {
	assert.deepEqual(buildTimeline(20, { coverDuration: 3, screenshotDuration: 4 }), {
		totalDuration: 20,
		cover: { start: 0, end: 3, duration: 3 },
		screenshot: { start: 3, end: 7, duration: 4 },
		body: { start: 7, end: 20, duration: 13 },
	});
});

test('buildTimeline compresses body stage to zero when audio is short', () => {
	assert.deepEqual(buildTimeline(5, { coverDuration: 3, screenshotDuration: 4 }), {
		totalDuration: 7,
		cover: { start: 0, end: 3, duration: 3 },
		screenshot: { start: 3, end: 7, duration: 4 },
		body: { start: 7, end: 7, duration: 0 },
	});
});
```

- [ ] **Step 2: Run tests to verify they fail because implementation is missing**

Run:

```bash
node --test tools/video-composer/compose-video.test.mjs
```

Expected: FAIL with an import error for missing exports from `compose-video.mjs`.

- [ ] **Step 3: Implement pure helpers and a CLI skeleton**

Create `tools/video-composer/compose-video.mjs` with:

```js
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function splitScriptIntoSubtitleChunks(text, options = {}) {
	const maxChars = options.maxChars ?? 28;
	const normalized = String(text)
		.replace(/\r\n/g, '\n')
		.replace(/[ \t]+/g, ' ')
		.replace(/\n{2,}/g, '\n')
		.trim();

	if (!normalized) return [];

	const sentenceParts = normalized
		.split(/(?<=[。！？!?；;：:\n])/u)
		.map((part) => part.trim())
		.filter(Boolean);

	const chunks = [];
	for (const part of sentenceParts.length > 0 ? sentenceParts : [normalized]) {
		if (part.length <= maxChars) {
			chunks.push(part);
			continue;
		}

		for (let index = 0; index < part.length; index += maxChars) {
			chunks.push(part.slice(index, index + maxChars));
		}
	}

	return chunks;
}

export function assEscape(text) {
	return String(text).replace(/\\/g, '\\\\').replace(/\n/g, '\\N').replace(/[{}]/g, '\\$&');
}

export function toAssTime(seconds) {
	const safeSeconds = Math.max(0, Number(seconds) || 0);
	const hours = Math.floor(safeSeconds / 3600);
	const minutes = Math.floor((safeSeconds % 3600) / 60);
	const wholeSeconds = Math.floor(safeSeconds % 60);
	const centiseconds = Math.round((safeSeconds - Math.floor(safeSeconds)) * 100);

	return `${hours}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

export function buildTimeline(audioDuration, options = {}) {
	const coverDuration = Number(options.coverDuration ?? 3);
	const screenshotDuration = Number(options.screenshotDuration ?? 4);
	const introDuration = coverDuration + screenshotDuration;
	const totalDuration = Math.max(Number(audioDuration) || 0, introDuration);

	return {
		totalDuration,
		cover: { start: 0, end: coverDuration, duration: coverDuration },
		screenshot: {
			start: coverDuration,
			end: introDuration,
			duration: screenshotDuration,
		},
		body: {
			start: introDuration,
			end: totalDuration,
			duration: Math.max(0, totalDuration - introDuration),
		},
	};
}

function main() {
	const jobPath = process.argv[2];
	if (!jobPath) {
		console.error('Usage: node tools/video-composer/compose-video.mjs JOB_JSON_PATH');
		process.exit(2);
	}

	const resolvedJobPath = path.resolve(jobPath);
	if (!fs.existsSync(resolvedJobPath)) {
		console.error(`Job file not found: ${resolvedJobPath}`);
		process.exit(2);
	}

	console.error('Rendering is unavailable in this helper-only milestone.');
	process.exit(2);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main();
}
```

- [ ] **Step 4: Run unit tests to verify helper behavior**

Run:

```bash
node --test tools/video-composer/compose-video.test.mjs
```

Expected: PASS for all helper tests.

- [ ] **Step 5: Commit helper tests and implementation**

Run:

```bash
git add tools/video-composer/compose-video.mjs tools/video-composer/compose-video.test.mjs
git commit -m "feat: add video composer helpers"
```

---

### Task 2: Add Job Validation, Subtitle Generation, And FFmpeg Command Construction

**Files:**
- Modify: `tools/video-composer/compose-video.mjs`
- Modify: `tools/video-composer/compose-video.test.mjs`

- [ ] **Step 1: Add failing tests for job validation, subtitle file content, and command construction**

Append to `tools/video-composer/compose-video.test.mjs`:

```js
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

import {
	buildFfmpegArgs,
	createAssSubtitle,
	normalizeJob,
} from './compose-video.mjs';

test('normalizeJob applies defaults and preserves explicit paths', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'video-composer-job-'));
	const job = normalizeJob({
		jobId: 'unit-test',
		inputs: {
			coverImage: path.join(tmp, 'cover.png'),
			screenshotImage: path.join(tmp, 'screenshot.png'),
			backgroundVideo: path.join(tmp, 'background.mp4'),
			scriptText: path.join(tmp, 'script.txt'),
			ttsAudio: path.join(tmp, 'audio.mp3'),
		},
		output: {
			video: path.join(tmp, 'final.mp4'),
			subtitles: path.join(tmp, 'subtitles.ass'),
			ffmpegLog: path.join(tmp, 'ffmpeg.log'),
		},
	});

	assert.equal(job.video.width, 1920);
	assert.equal(job.video.height, 1080);
	assert.equal(job.video.fps, 30);
	assert.equal(job.video.coverDuration, 3);
	assert.equal(job.video.screenshotDuration, 4);
	assert.equal(job.layout.coverTop.x, 80);
	assert.equal(job.layout.screenshotTop.x, 1280);
});

test('createAssSubtitle writes readable subtitle events', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'video-composer-subtitles-'));
	const outputPath = path.join(tmp, 'subtitles.ass');

	createAssSubtitle({
		scriptText: '第一句。第二句。',
		outputPath,
		totalDuration: 8,
		width: 1920,
		height: 1080,
		subtitleBottomMargin: 90,
	});

	const content = fs.readFileSync(outputPath, 'utf8');
	assert.match(content, /\[Script Info\]/);
	assert.match(content, /PlayResX: 1920/);
	assert.match(content, /Dialogue: 0,0:00:00.00,0:00:04.00/);
	assert.match(content, /第一句。/);
	assert.match(content, /第二句。/);
});

test('buildFfmpegArgs includes expected media inputs and output settings', () => {
	const job = normalizeJob({
		jobId: 'unit-test',
		inputs: {
			coverImage: '/tmp/job/inputs/cover.png',
			screenshotImage: '/tmp/job/inputs/screenshot.png',
			backgroundVideo: '/tmp/job/inputs/background.mp4',
			scriptText: '/tmp/job/inputs/script.txt',
			ttsAudio: '/tmp/job/tts/audio.mp3',
		},
		output: {
			video: '/tmp/job/render/final.mp4',
			subtitles: '/tmp/job/render/subtitles.ass',
			ffmpegLog: '/tmp/job/render/ffmpeg.log',
		},
	});

	const args = buildFfmpegArgs(job, { audioDuration: 12 });
	assert.deepEqual(args.slice(0, 4), ['-y', '-stream_loop', '-1', '-i']);
	assert.equal(args.includes('/tmp/job/inputs/background.mp4'), true);
	assert.equal(args.includes('/tmp/job/inputs/cover.png'), true);
	assert.equal(args.includes('/tmp/job/inputs/screenshot.png'), true);
	assert.equal(args.includes('/tmp/job/tts/audio.mp3'), true);
	assert.equal(args.includes('/tmp/job/render/final.mp4'), true);
	assert.equal(args.includes('-filter_complex'), true);
	assert.equal(args.includes('-c:v'), true);
	assert.equal(args.includes('libx264'), true);
});
```

- [ ] **Step 2: Run tests to verify new exports are missing**

Run:

```bash
node --test tools/video-composer/compose-video.test.mjs
```

Expected: FAIL because `normalizeJob`, `createAssSubtitle`, and `buildFfmpegArgs` are not exported.

- [ ] **Step 3: Implement validation, subtitle writer, and FFmpeg args**

Replace `tools/video-composer/compose-video.mjs` with this complete file:

```js
#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function splitScriptIntoSubtitleChunks(text, options = {}) {
	const maxChars = options.maxChars ?? 28;
	const normalized = String(text)
		.replace(/\r\n/g, '\n')
		.replace(/[ \t]+/g, ' ')
		.replace(/\n{2,}/g, '\n')
		.trim();

	if (!normalized) return [];

	const sentenceParts = normalized
		.split(/(?<=[。！？!?；;：:\n])/u)
		.map((part) => part.trim())
		.filter(Boolean);

	const chunks = [];
	for (const part of sentenceParts.length > 0 ? sentenceParts : [normalized]) {
		if (part.length <= maxChars) {
			chunks.push(part);
			continue;
		}

		for (let index = 0; index < part.length; index += maxChars) {
			chunks.push(part.slice(index, index + maxChars));
		}
	}

	return chunks;
}

export function assEscape(text) {
	return String(text).replace(/\\/g, '\\\\').replace(/\n/g, '\\N').replace(/[{}]/g, '\\$&');
}

export function toAssTime(seconds) {
	const safeSeconds = Math.max(0, Number(seconds) || 0);
	const hours = Math.floor(safeSeconds / 3600);
	const minutes = Math.floor((safeSeconds % 3600) / 60);
	const wholeSeconds = Math.floor(safeSeconds % 60);
	const centiseconds = Math.round((safeSeconds - Math.floor(safeSeconds)) * 100);

	return `${hours}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

export function buildTimeline(audioDuration, options = {}) {
	const coverDuration = Number(options.coverDuration ?? 3);
	const screenshotDuration = Number(options.screenshotDuration ?? 4);
	const introDuration = coverDuration + screenshotDuration;
	const totalDuration = Math.max(Number(audioDuration) || 0, introDuration);

	return {
		totalDuration,
		cover: { start: 0, end: coverDuration, duration: coverDuration },
		screenshot: {
			start: coverDuration,
			end: introDuration,
			duration: screenshotDuration,
		},
		body: {
			start: introDuration,
			end: totalDuration,
			duration: Math.max(0, totalDuration - introDuration),
		},
	};
}

export function normalizeJob(rawJob) {
	const job = {
		...rawJob,
		video: {
			width: 1920,
			height: 1080,
			fps: 30,
			coverDuration: 3,
			screenshotDuration: 4,
			...(rawJob.video ?? {}),
		},
		layout: {
			coverTop: { x: 80, y: 60, width: 560, ...(rawJob.layout?.coverTop ?? {}) },
			screenshotTop: {
				x: 1280,
				y: 60,
				width: 560,
				...(rawJob.layout?.screenshotTop ?? {}),
			},
			subtitleBottomMargin: rawJob.layout?.subtitleBottomMargin ?? 90,
		},
	};

	for (const field of ['coverImage', 'screenshotImage', 'backgroundVideo', 'scriptText', 'ttsAudio']) {
		if (!job.inputs?.[field]) throw new Error(`Missing inputs.${field}`);
	}

	for (const field of ['video', 'subtitles', 'ffmpegLog']) {
		if (!job.output?.[field]) throw new Error(`Missing output.${field}`);
	}

	return job;
}

export function assertInputFiles(job) {
	for (const [name, filePath] of Object.entries(job.inputs)) {
		if (!fs.existsSync(filePath)) {
			throw new Error(`Missing input file for ${name}: ${filePath}`);
		}
	}
}

export function createAssSubtitle({
	scriptText,
	outputPath,
	totalDuration,
	width,
	height,
	subtitleBottomMargin,
}) {
	const chunks = splitScriptIntoSubtitleChunks(scriptText);
	if (chunks.length === 0) throw new Error('Script text is empty');

	const eventDuration = totalDuration / chunks.length;
	const events = chunks.map((chunk, index) => {
		const start = index * eventDuration;
		const end = index === chunks.length - 1 ? totalDuration : (index + 1) * eventDuration;
		return `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},Default,,0,0,0,,${assEscape(chunk)}`;
	});

	const content = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,64,&H00F7F7A0,&H000000FF,&H00000000,&HAA000000,-1,0,0,0,100,100,0,0,3,2,0,2,80,80,${subtitleBottomMargin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join('\n')}
`;

	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	fs.writeFileSync(outputPath, content);
}

function escapeForFilterPath(filePath) {
	return filePath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

export function buildFfmpegArgs(job, { audioDuration }) {
	const timeline = buildTimeline(audioDuration, job.video);
	const { width, height, fps } = job.video;
	const bodyDuration = Math.max(0, timeline.body.duration);
	const screenshotTopHeight = Math.round((job.layout.screenshotTop.width * 9) / 16);
	const coverTopHeight = Math.round((job.layout.coverTop.width * 9) / 16);
	const subtitlePath = escapeForFilterPath(job.output.subtitles);

	const bodyVideo = bodyDuration > 0
		? `[0:v]trim=start=${timeline.body.start}:duration=${bodyDuration},setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1[bodybg];` +
			`[1:v]scale=${job.layout.coverTop.width}:${coverTopHeight}:force_original_aspect_ratio=decrease,pad=${job.layout.coverTop.width}:${coverTopHeight}:(ow-iw)/2:(oh-ih)/2:color=white[covertop];` +
			`[2:v]scale=${job.layout.screenshotTop.width}:${screenshotTopHeight}:force_original_aspect_ratio=decrease,pad=${job.layout.screenshotTop.width}:${screenshotTopHeight}:(ow-iw)/2:(oh-ih)/2:color=white[screentop];` +
			`[bodybg][covertop]overlay=${job.layout.coverTop.x}:${job.layout.coverTop.y}[body1];` +
			`[body1][screentop]overlay=${job.layout.screenshotTop.x}:${job.layout.screenshotTop.y}[body]`
		: `color=c=black:s=${width}x${height}:d=0.01[body]`;

	const filter = [
		`[0:v]trim=start=0:duration=${timeline.cover.duration},setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1[coverbg]`,
		`[1:v]scale=1500:820:force_original_aspect_ratio=decrease,pad=1500:820:(ow-iw)/2:(oh-ih)/2:color=white[covermain]`,
		`[coverbg][covermain]overlay=(W-w)/2:(H-h)/2[cover]`,
		`[0:v]trim=start=${timeline.screenshot.start}:duration=${timeline.screenshot.duration},setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1[screenbg]`,
		`[2:v]scale=1600:780:force_original_aspect_ratio=decrease,pad=1600:780:(ow-iw)/2:(oh-ih)/2:color=white[screenmain]`,
		`[screenbg][screenmain]overlay=(W-w)/2:(H-h)/2[screen]`,
		bodyVideo,
		`[cover][screen][body]concat=n=3:v=1:a=0,subtitles='${subtitlePath}'[vout]`,
	].join(';');

	return [
		'-y',
		'-stream_loop',
		'-1',
		'-i',
		job.inputs.backgroundVideo,
		'-loop',
		'1',
		'-i',
		job.inputs.coverImage,
		'-loop',
		'1',
		'-i',
		job.inputs.screenshotImage,
		'-i',
		job.inputs.ttsAudio,
		'-filter_complex',
		filter,
		'-map',
		'[vout]',
		'-map',
		'3:a',
		'-t',
		String(timeline.totalDuration),
		'-r',
		String(fps),
		'-c:v',
		'libx264',
		'-pix_fmt',
		'yuv420p',
		'-c:a',
		'aac',
		'-shortest',
		job.output.video,
	];
}

export function getAudioDuration(audioPath) {
	const result = spawnSync('ffprobe', [
		'-v',
		'error',
		'-show_entries',
		'format=duration',
		'-of',
		'default=noprint_wrappers=1:nokey=1',
		audioPath,
	], { encoding: 'utf8' });

	if (result.status !== 0) {
		throw new Error(`ffprobe failed: ${result.stderr || result.stdout}`);
	}

	const duration = Number.parseFloat(result.stdout.trim());
	if (!Number.isFinite(duration) || duration <= 0) {
		throw new Error(`Invalid audio duration from ffprobe: ${result.stdout}`);
	}

	return duration;
}

export function render(job) {
	assertInputFiles(job);
	const scriptText = fs.readFileSync(job.inputs.scriptText, 'utf8');
	const audioDuration = getAudioDuration(job.inputs.ttsAudio);
	const timeline = buildTimeline(audioDuration, job.video);
	createAssSubtitle({
		scriptText,
		outputPath: job.output.subtitles,
		totalDuration: timeline.totalDuration,
		width: job.video.width,
		height: job.video.height,
		subtitleBottomMargin: job.layout.subtitleBottomMargin,
	});

	fs.mkdirSync(path.dirname(job.output.video), { recursive: true });
	fs.mkdirSync(path.dirname(job.output.ffmpegLog), { recursive: true });

	const args = buildFfmpegArgs(job, { audioDuration });
	const result = spawnSync('ffmpeg', args, { encoding: 'utf8' });
	fs.writeFileSync(job.output.ffmpegLog, `${result.stdout}\n${result.stderr}`);

	if (result.status !== 0) {
		throw new Error(`ffmpeg failed with exit code ${result.status}; see ${job.output.ffmpegLog}`);
	}

	const stats = fs.statSync(job.output.video);
	if (stats.size === 0) throw new Error(`Output video is empty: ${job.output.video}`);
}

function main() {
	const jobPath = process.argv[2];
	if (!jobPath) {
		console.error('Usage: node tools/video-composer/compose-video.mjs JOB_JSON_PATH');
		process.exit(2);
	}

	try {
		const rawJob = JSON.parse(fs.readFileSync(path.resolve(jobPath), 'utf8'));
		render(normalizeJob(rawJob));
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main();
}
```

- [ ] **Step 4: Run tests to verify helpers pass**

Run:

```bash
node --test tools/video-composer/compose-video.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit composer command construction**

Run:

```bash
git add tools/video-composer/compose-video.mjs tools/video-composer/compose-video.test.mjs
git commit -m "feat: build video composer ffmpeg config"
```

---

### Task 3: Add Smoke Render Coverage

**Files:**
- Modify: `tools/video-composer/compose-video.test.mjs`

- [ ] **Step 1: Add a smoke test that generates tiny fixtures with FFmpeg**

Append to `tools/video-composer/compose-video.test.mjs`:

```js
import { spawnSync } from 'node:child_process';

import {
	render,
} from './compose-video.mjs';

function commandExists(command) {
	const result = spawnSync(command, ['-version'], { encoding: 'utf8' });
	return result.status === 0;
}

test('render creates an mp4 from generated fixtures', { skip: process.env.RUN_VIDEO_COMPOSER_SMOKE !== '1' }, () => {
	if (!commandExists('ffmpeg') || !commandExists('ffprobe')) {
		assert.fail('ffmpeg and ffprobe are required for RUN_VIDEO_COMPOSER_SMOKE=1');
	}

	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'video-composer-smoke-'));
	const cover = path.join(tmp, 'cover.png');
	const screenshot = path.join(tmp, 'screenshot.png');
	const background = path.join(tmp, 'background.mp4');
	const script = path.join(tmp, 'script.txt');
	const audio = path.join(tmp, 'audio.mp3');
	const output = path.join(tmp, 'final.mp4');
	const subtitles = path.join(tmp, 'subtitles.ass');
	const ffmpegLog = path.join(tmp, 'ffmpeg.log');

	fs.writeFileSync(script, '这是封面展示。现在展示内容截图。最后进入双图置顶讲解。');

	for (const [color, file] of [['0xD9EAF7', cover], ['0xFFFFFF', screenshot]]) {
		const result = spawnSync('ffmpeg', [
			'-y',
			'-f',
			'lavfi',
			'-i',
			`color=c=${color}:s=1280x720:d=1`,
			'-frames:v',
			'1',
			file,
		], { encoding: 'utf8' });
		assert.equal(result.status, 0, result.stderr);
	}

	let result = spawnSync('ffmpeg', [
		'-y',
		'-f',
		'lavfi',
		'-i',
		'testsrc2=s=1280x720:r=30:d=2',
		'-c:v',
		'libx264',
		'-pix_fmt',
		'yuv420p',
		background,
	], { encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);

	result = spawnSync('ffmpeg', [
		'-y',
		'-f',
		'lavfi',
		'-i',
		'sine=frequency=440:duration=8',
		'-c:a',
		'libmp3lame',
		audio,
	], { encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);

	render(normalizeJob({
		jobId: 'smoke-test',
		inputs: {
			coverImage: cover,
			screenshotImage: screenshot,
			backgroundVideo: background,
			scriptText: script,
			ttsAudio: audio,
		},
		output: {
			video: output,
			subtitles,
			ffmpegLog,
		},
		video: {
			width: 1280,
			height: 720,
			fps: 24,
			coverDuration: 3,
			screenshotDuration: 4,
		},
		layout: {
			coverTop: { x: 40, y: 30, width: 300 },
			screenshotTop: { x: 920, y: 30, width: 300 },
			subtitleBottomMargin: 60,
		},
	}));

	assert.equal(fs.existsSync(output), true);
	assert.equal(fs.statSync(output).size > 0, true);
	assert.equal(fs.existsSync(subtitles), true);
	assert.equal(fs.existsSync(ffmpegLog), true);
});
```

- [ ] **Step 2: Run regular unit tests**

Run:

```bash
node --test tools/video-composer/compose-video.test.mjs
```

Expected: PASS, with the smoke test skipped.

- [ ] **Step 3: Run smoke test if FFmpeg is installed**

Run:

```bash
RUN_VIDEO_COMPOSER_SMOKE=1 node --test tools/video-composer/compose-video.test.mjs
```

Expected: PASS and a generated temporary `final.mp4`. If this fails, inspect the printed FFmpeg stderr and `ffmpeg.log`.

- [ ] **Step 4: Commit smoke coverage**

Run:

```bash
git add tools/video-composer/compose-video.test.mjs
git commit -m "test: add video composer smoke render"
```

---

### Task 4: Add Importable n8n Workflow JSON

**Files:**
- Create: `workflows/video-clip-tts-workflow.json`

- [ ] **Step 1: Create the workflow JSON**

Create `workflows/video-clip-tts-workflow.json` with this importable workflow skeleton. It intentionally uses environment variables for Doubao settings and repository paths so secrets are not committed.

```json
{
  "name": "MVP - TTS Video Clip Composer",
  "nodes": [
    {
      "parameters": {
        "formTitle": "TTS Video Clip Composer",
        "formDescription": "Upload a cover image, proof screenshot, TTS script, and background video to create an edited 16:9 MP4.",
        "formFields": {
          "values": [
            {
              "fieldLabel": "cover_image",
              "fieldType": "file",
              "requiredField": true
            },
            {
              "fieldLabel": "proof_screenshot",
              "fieldType": "file",
              "requiredField": true
            },
            {
              "fieldLabel": "tts_script",
              "fieldType": "file",
              "requiredField": true
            },
            {
              "fieldLabel": "background_video",
              "fieldType": "file",
              "requiredField": true
            }
          ]
        },
        "responseMode": "responseNode"
      },
      "id": "0f3d4c1a-17c9-4fa0-8f8a-a913adbcf4a1",
      "name": "Upload Assets",
      "type": "n8n-nodes-base.formTrigger",
      "typeVersion": 2,
      "position": [0, 0],
      "webhookId": "video-clip-tts-upload"
    },
    {
      "parameters": {
        "jsCode": "const crypto = require('crypto');\nconst path = require('path');\nconst now = new Date();\nconst stamp = now.toISOString().replace(/[-:]/g, '').replace(/\\.\\d{3}Z$/, '').replace('T', '-');\nconst jobId = `${stamp}-${crypto.randomBytes(3).toString('hex')}`;\nconst baseDir = $env.VIDEO_CLIP_JOBS_DIR || '/tmp/n8n-video-jobs';\nconst repoDir = $env.VIDEO_CLIP_REPO_DIR || '/Users/stephenqiu/Desktop/Repository/n8n';\nconst jobDir = path.join(baseDir, jobId);\nreturn [{ json: { jobId, baseDir, repoDir, jobDir, inputsDir: path.join(jobDir, 'inputs'), ttsDir: path.join(jobDir, 'tts'), renderDir: path.join(jobDir, 'render') }, binary: $binary }];"
      },
      "id": "be754c0e-5a12-49df-8cb9-d0e37f77c4c7",
      "name": "Prepare Job",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [240, 0]
    },
    {
      "parameters": {
        "jsCode": "const fs = require('fs');\nconst path = require('path');\nconst item = $input.first();\nconst binary = item.binary || {};\nconst required = ['cover_image', 'proof_screenshot', 'tts_script', 'background_video'];\nfor (const key of required) {\n  if (!binary[key]) throw new Error(`Missing uploaded file: ${key}`);\n}\nfs.mkdirSync(item.json.inputsDir, { recursive: true });\nfs.mkdirSync(item.json.ttsDir, { recursive: true });\nfs.mkdirSync(item.json.renderDir, { recursive: true });\nconst files = {\n  coverImage: path.join(item.json.inputsDir, 'cover.png'),\n  screenshotImage: path.join(item.json.inputsDir, 'screenshot.png'),\n  scriptText: path.join(item.json.inputsDir, 'script.txt'),\n  backgroundVideo: path.join(item.json.inputsDir, 'background.mp4'),\n};\nfor (const [binaryKey, target] of [['cover_image', files.coverImage], ['proof_screenshot', files.screenshotImage], ['tts_script', files.scriptText], ['background_video', files.backgroundVideo]]) {\n  const buffer = await this.helpers.getBinaryDataBuffer(0, binaryKey);\n  fs.writeFileSync(target, buffer);\n}\nconst scriptText = fs.readFileSync(files.scriptText, 'utf8').replace(/\\r\\n/g, '\\n').replace(/\\n{2,}/g, '\\n').trim();\nif (!scriptText) throw new Error('TTS script is empty');\nfs.writeFileSync(files.scriptText, scriptText);\nreturn [{ json: { ...item.json, files, scriptText } }];"
      },
      "id": "f2a77f74-f84b-43d9-8057-7ca810f8610f",
      "name": "Save Uploaded Files",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [480, 0]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{$env.DOUBAO_TTS_URL}}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "=Bearer {{$env.DOUBAO_TTS_API_KEY}}"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ { app: { appid: $env.DOUBAO_TTS_APP_ID, token: $env.DOUBAO_TTS_API_KEY, cluster: $env.DOUBAO_TTS_CLUSTER || 'volcano_tts' }, user: { uid: 'n8n-video-clip' }, audio: { voice_type: $env.DOUBAO_TTS_VOICE || 'zh_female_shuangkuaisisi_moon_bigtts', encoding: 'mp3', speed_ratio: 1.0 }, request: { reqid: $json.jobId, text: $json.scriptText, operation: 'query' } } }}",
        "options": {
          "response": {
            "response": {
              "responseFormat": "json"
            }
          }
        }
      },
      "id": "f7379bdb-f54e-4fc6-b74d-0ea84f208929",
      "name": "Doubao TTS Request",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [720, 0]
    },
    {
      "parameters": {
        "jsCode": "const fs = require('fs');\nconst path = require('path');\nconst previous = $('Save Uploaded Files').first().json;\nconst response = $input.first().json;\nfs.writeFileSync(path.join(previous.ttsDir, 'tts-response.json'), JSON.stringify(response, null, 2));\nconst audioBase64 = response.data || response.audio || response.result?.audio || response.result?.data;\nif (!audioBase64 || typeof audioBase64 !== 'string') {\n  throw new Error('Doubao TTS response did not include base64 audio in data/audio/result.audio/result.data');\n}\nconst audioPath = path.join(previous.ttsDir, 'audio.mp3');\nfs.writeFileSync(audioPath, Buffer.from(audioBase64, 'base64'));\nif (fs.statSync(audioPath).size === 0) throw new Error('Doubao TTS audio is empty');\nreturn [{ json: { ...previous, audioPath, ttsResponsePath: path.join(previous.ttsDir, 'tts-response.json') } }];"
      },
      "id": "ca19b3fe-5e0c-4541-bb84-a6dfefc98156",
      "name": "Save TTS Audio",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [960, 0]
    },
    {
      "parameters": {
        "jsCode": "const fs = require('fs');\nconst path = require('path');\nconst item = $input.first().json;\nconst job = {\n  jobId: item.jobId,\n  inputs: {\n    coverImage: item.files.coverImage,\n    screenshotImage: item.files.screenshotImage,\n    backgroundVideo: item.files.backgroundVideo,\n    scriptText: item.files.scriptText,\n    ttsAudio: item.audioPath\n  },\n  output: {\n    video: path.join(item.renderDir, 'final.mp4'),\n    subtitles: path.join(item.renderDir, 'subtitles.ass'),\n    ffmpegLog: path.join(item.renderDir, 'ffmpeg.log')\n  },\n  video: { width: 1920, height: 1080, fps: 30, coverDuration: 3, screenshotDuration: 4 },\n  layout: { coverTop: { x: 80, y: 60, width: 560 }, screenshotTop: { x: 1280, y: 60, width: 560 }, subtitleBottomMargin: 90 }\n};\nconst jobPath = path.join(item.jobDir, 'job.json');\nfs.writeFileSync(jobPath, JSON.stringify(job, null, 2));\nreturn [{ json: { ...item, jobPath, outputVideo: job.output.video, ffmpegLog: job.output.ffmpegLog } }];"
      },
      "id": "f3511981-d156-4783-ad12-11a74c29a33b",
      "name": "Build Job Config",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1200, 0]
    },
    {
      "parameters": {
        "command": "=node {{$json.repoDir}}/tools/video-composer/compose-video.mjs {{$json.jobPath}}"
      },
      "id": "2b37a207-0a84-44b4-99e9-c9d08bd1f50d",
      "name": "Run Composer Script",
      "type": "n8n-nodes-base.executeCommand",
      "typeVersion": 1,
      "position": [1440, 0]
    },
    {
      "parameters": {
        "jsCode": "const fs = require('fs');\nconst item = $('Build Job Config').first().json;\nif (!fs.existsSync(item.outputVideo)) {\n  throw new Error(`Final video was not created: ${item.outputVideo}`);\n}\nconst size = fs.statSync(item.outputVideo).size;\nif (size === 0) throw new Error(`Final video is empty: ${item.outputVideo}`);\nreturn [{ json: { jobId: item.jobId, jobDir: item.jobDir, videoPath: item.outputVideo, ffmpegLog: item.ffmpegLog, size } }];"
      },
      "id": "db4a22de-a8cc-4724-a426-d767b67f8887",
      "name": "Verify Final Video",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1680, 0]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { ok: true, jobId: $json.jobId, videoPath: $json.videoPath, jobDir: $json.jobDir, ffmpegLog: $json.ffmpegLog, size: $json.size } }}"
      },
      "id": "0c4f9831-a1b2-4c30-a08e-b7d1660a750a",
      "name": "Respond With Result",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [1920, 0]
    }
  ],
  "connections": {
    "Upload Assets": {
      "main": [[{ "node": "Prepare Job", "type": "main", "index": 0 }]]
    },
    "Prepare Job": {
      "main": [[{ "node": "Save Uploaded Files", "type": "main", "index": 0 }]]
    },
    "Save Uploaded Files": {
      "main": [[{ "node": "Doubao TTS Request", "type": "main", "index": 0 }]]
    },
    "Doubao TTS Request": {
      "main": [[{ "node": "Save TTS Audio", "type": "main", "index": 0 }]]
    },
    "Save TTS Audio": {
      "main": [[{ "node": "Build Job Config", "type": "main", "index": 0 }]]
    },
    "Build Job Config": {
      "main": [[{ "node": "Run Composer Script", "type": "main", "index": 0 }]]
    },
    "Run Composer Script": {
      "main": [[{ "node": "Verify Final Video", "type": "main", "index": 0 }]]
    },
    "Verify Final Video": {
      "main": [[{ "node": "Respond With Result", "type": "main", "index": 0 }]]
    }
  },
  "settings": {
    "executionOrder": "v1"
  },
  "staticData": null,
  "pinData": {},
  "active": false,
  "versionId": "video-clip-tts-workflow-v1",
  "meta": {
    "templateCredsSetupCompleted": false
  },
  "tags": []
}
```

- [ ] **Step 2: Validate JSON syntax**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('workflows/video-clip-tts-workflow.json','utf8')); console.log('workflow json ok')"
```

Expected:

```text
workflow json ok
```

- [ ] **Step 3: Import workflow into local n8n**

Run while n8n is available:

```bash
pnpm start
```

Then import `workflows/video-clip-tts-workflow.json` from the n8n UI. Expected: workflow loads and shows nodes from `Upload Assets` through `Respond With Result`.

- [ ] **Step 4: Commit workflow JSON**

Run:

```bash
git add workflows/video-clip-tts-workflow.json
git commit -m "feat: add importable video clip workflow"
```

---

### Task 5: Add Operator Documentation

**Files:**
- Create: `docs/video-clip-tts-workflow.md`

- [ ] **Step 1: Write usage documentation**

Create `docs/video-clip-tts-workflow.md` with:

```markdown
# TTS Video Clip Composer Workflow

This workflow is an automated video editing workflow for n8n. It is not an AI video generation workflow. The final image content comes from uploaded files: cover image, proof screenshot, and background video. The workflow generates TTS audio and subtitles, then uses FFmpeg to edit the final MP4.

## Files

- Workflow import file: `workflows/video-clip-tts-workflow.json`
- Composer script: `tools/video-composer/compose-video.mjs`
- Default job output: `/tmp/n8n-video-jobs/{jobId}/`

## Prerequisites

Install and verify:

```bash
node --version
ffmpeg -version
ffprobe -version
pnpm --version
```

## Environment Variables

Configure these for n8n before running the workflow:

```bash
export VIDEO_CLIP_REPO_DIR=/Users/stephenqiu/Desktop/Repository/n8n
export VIDEO_CLIP_JOBS_DIR=/tmp/n8n-video-jobs
: "${DOUBAO_TTS_URL:?set the Doubao TTS endpoint URL}"
: "${DOUBAO_TTS_API_KEY:?set the Doubao TTS API key}"
: "${DOUBAO_TTS_APP_ID:?set the Doubao TTS app id}"
export DOUBAO_TTS_CLUSTER=volcano_tts
export DOUBAO_TTS_VOICE=zh_female_shuangkuaisisi_moon_bigtts
```

Do not commit real TTS secrets.

## Import

1. Start n8n from the repository root:

```bash
pnpm start
```

2. Open `http://localhost:5678`.
3. Import `workflows/video-clip-tts-workflow.json`.
4. Open the form/test URL for the `Upload Assets` node.

## Inputs

Upload all four files:

- `cover_image`: `png`, `jpg`, `jpeg`, or `webp`
- `proof_screenshot`: `png`, `jpg`, `jpeg`, or `webp`
- `tts_script`: `txt` or `md`
- `background_video`: `mp4`, `mov`, or `webm`

## Output Layout

- `0s - 3s`: cover image large display
- `3s - 7s`: proof screenshot large display
- `7s - end`: cover image top-left, proof screenshot top-right, background video underneath, TTS subtitles at bottom

## Result

The workflow returns JSON:

```json
{
  "ok": true,
  "jobId": "20260528-101530-a8f42c",
  "videoPath": "/tmp/n8n-video-jobs/20260528-101530-a8f42c/render/final.mp4",
  "jobDir": "/tmp/n8n-video-jobs/20260528-101530-a8f42c",
  "ffmpegLog": "/tmp/n8n-video-jobs/20260528-101530-a8f42c/render/ffmpeg.log",
  "size": 1234567
}
```

## Troubleshooting

If TTS fails, inspect:

```text
/tmp/n8n-video-jobs/{jobId}/tts/tts-response.json
```

If video rendering fails, inspect:

```text
/tmp/n8n-video-jobs/{jobId}/job.json
/tmp/n8n-video-jobs/{jobId}/render/ffmpeg.log
```

Re-run the composer directly:

```bash
node tools/video-composer/compose-video.mjs /tmp/n8n-video-jobs/{jobId}/job.json
```

## Local Composer Tests

Run unit tests:

```bash
node --test tools/video-composer/compose-video.test.mjs
```

Run FFmpeg smoke render:

```bash
RUN_VIDEO_COMPOSER_SMOKE=1 node --test tools/video-composer/compose-video.test.mjs
```
```

- [ ] **Step 2: Check documentation for forbidden positioning**

Run:

```bash
rg -n "AI 视频生成|文生视频|AI video generation" docs/video-clip-tts-workflow.md
```

Expected: only the explicit negative boundary sentence appears.

- [ ] **Step 3: Commit documentation**

Run:

```bash
git add docs/video-clip-tts-workflow.md
git commit -m "docs: add video clip workflow usage"
```

---

### Task 6: Add Local Ignore Rules And Final Verification

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add local artifact ignore rules**

Append to `.gitignore` only if these entries are not already present:

```gitignore
.superpowers/
tmp/n8n-video-jobs/
```

Do not ignore `/tmp/n8n-video-jobs` because it is outside the repository.

- [ ] **Step 2: Run complete local verification**

Run:

```bash
node --test tools/video-composer/compose-video.test.mjs
RUN_VIDEO_COMPOSER_SMOKE=1 node --test tools/video-composer/compose-video.test.mjs
node -e "JSON.parse(require('fs').readFileSync('workflows/video-clip-tts-workflow.json','utf8')); console.log('workflow json ok')"
git diff --check
```

Expected:

```text
workflow json ok
```

Expected test result: all tests pass, with the smoke test producing a temporary MP4.

- [ ] **Step 3: Run n8n import smoke manually**

Run:

```bash
pnpm start
```

Open `http://localhost:5678`, import `workflows/video-clip-tts-workflow.json`, and confirm the workflow appears with this node sequence:

```text
Upload Assets
Prepare Job
Save Uploaded Files
Doubao TTS Request
Save TTS Audio
Build Job Config
Run Composer Script
Verify Final Video
Respond With Result
```

- [ ] **Step 4: Commit ignore rules**

Run:

```bash
git add .gitignore
git commit -m "chore: ignore local video workflow artifacts"
```

- [ ] **Step 5: Report final status**

Include:

```text
Implemented:
- Composer script path
- Workflow JSON path
- Usage doc path

Verified:
- Unit test command and result
- Smoke render command and result
- Workflow JSON parse result
- n8n import result

Known operator setup:
- Doubao TTS env vars must be configured before running the workflow
- ffmpeg and ffprobe must be installed
```

---

## Self-Review

- Spec coverage: Tasks cover the importable workflow, local composer script, Doubao TTS orchestration, job directory, three-stage timeline, subtitles, FFmpeg logs, usage docs, and verification.
- Scope check: The plan does not add a custom frontend page, template selection, batch generation, vertical output, AI video generation, or n8n core changes.
- Placeholder scan: The plan contains no incomplete implementation markers. Doubao TTS settings are represented as environment-variable names, not committed values.
- Type consistency: The plan consistently uses `coverImage`, `screenshotImage`, `backgroundVideo`, `scriptText`, `ttsAudio`, `output.video`, `output.subtitles`, and `output.ffmpegLog` across tests, script, `job.json`, and workflow JSON.
