# PDF Science Explainer Video Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new importable n8n workflow that turns a PDF, background video, user viewpoint, narration mode, and voice selection into a PDF-grounded science explainer video.

**Architecture:** Add an independent workflow that reuses the existing PDF extraction, page timing, TTS/subtitle alignment, and job artifact conventions. Add focused new modules for science-explainer prompt/normalization, PDF page visual analysis prompt output, and a bottom-video-overlay FFmpeg composer that supports default `9:16` and optional `16:9` output.

**Tech Stack:** Node.js ESM scripts, `node:test`, n8n workflow JSON, FFmpeg/ffprobe, existing `tools/video-composer` utilities, existing Doubao/Ark/OpenAI-compatible LLM/TTS environment conventions.

---

## File Structure

- Create `tools/video-composer/compose-science-explainer-video.mjs`
  - Responsibility: validate composer job JSON, derive layout dimensions, generate ASS subtitles, render one segment per PDF page with PDF base layer plus bottom background-video overlay, concatenate segments, and extract merged audio.
- Create `tools/video-composer/compose-science-explainer-video.test.mjs`
  - Responsibility: unit-test composer validation, layout derivation, FFmpeg argument generation, subtitle margin calculation, and concat ordering.
- Create `tools/video-composer/science-explainer-utils.mjs`
  - Responsibility: normalize visual analysis JSON and science explainer script JSON without coupling to network calls.
- Create `tools/video-composer/science-explainer-utils.test.mjs`
  - Responsibility: unit-test strict page count validation, mode validation, page number validation, and required spoken prompt fields.
- Create `tools/video-composer/science-explainer-script-client.mjs`
  - Responsibility: build the science explainer LLM prompt from `pages.json`, `page-visual-analysis.json`, `viewpoint`, and `narration_mode`; call the existing OpenAI-compatible endpoint shape; write strict script JSON.
- Create `tools/video-composer/pdf-science-explainer-script/SKILL.md`
  - Responsibility: encode the viewpoint-led, PDF-checked Chinese science explainer behavior used by the script client prompt.
- Create `workflows/pdf-science-explainer-video-workflow.json`
  - Responsibility: importable n8n workflow with form upload, job setup, PDF extraction, visual analysis, script generation, TTS, composer job building, composer execution, and response.
- Create `tools/video-composer/science-explainer-workflow.test.mjs`
  - Responsibility: static workflow JSON tests for node names, form defaults, repo-local job directory, and required mode/aspect fields.
- Modify no existing workflow JSON files.

---

## Task 1: Composer Contract Tests

**Files:**
- Create: `tools/video-composer/compose-science-explainer-video.test.mjs`
- Create later: `tools/video-composer/compose-science-explainer-video.mjs`

- [ ] **Step 1: Confirm unit test cases with the user**

Ask:

```text
I am about to add focused node:test coverage for the new science explainer composer: job validation, aspect ratio defaults, bottom-video overlay math, subtitle safe margin, segment FFmpeg args, concat order, and re-encoded final concat. Please confirm these are the desired unit test cases before I write them.
```

Expected: user confirms these test cases.

- [ ] **Step 2: Write the failing composer tests**

Create `tools/video-composer/compose-science-explainer-video.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildScienceConcatList,
	buildScienceSegmentFfmpegArgs,
	buildScienceFinalConcatFfmpegArgs,
	buildSubtitleEventsForSegment,
	calculateScienceLayout,
	createAssSubtitle,
	scaleBackgroundVideoToOverlayFilter,
	scalePdfPageToCanvasFilter,
	validateScienceJob,
} from './compose-science-explainer-video.mjs';

const baseJob = {
	jobId: 'job-1',
	aspectRatio: '9:16',
	backgroundVideoPath: '/tmp/background.mp4',
	pagesManifestPath: '/tmp/pages.json',
	pageAudioManifestPath: '/tmp/page-audio.json',
	pageTimingPath: '/tmp/page-timing.json',
	subtitlePath: '/tmp/subtitles.ass',
	renderDir: '/tmp/render',
	outputVideoPath: '/tmp/final.mp4',
	outputAudioPath: '/tmp/merged-audio.mp3',
	ffmpegLogPath: '/tmp/ffmpeg.log',
	pagePauseSeconds: 0.3,
	bottomVideoHeightRatio: 0.2,
	width: 1080,
	height: 1920,
	fps: 30,
};

test('validateScienceJob defaults to vertical 9:16 output', () => {
	const { aspectRatio, pagePauseSeconds, bottomVideoHeightRatio, width, height, fps, ...minimalJob } = baseJob;
	const job = validateScienceJob(minimalJob);

	assert.equal(job.aspectRatio, '9:16');
	assert.equal(job.width, 1080);
	assert.equal(job.height, 1920);
	assert.equal(job.fps, 30);
	assert.equal(job.pagePauseSeconds, 0.3);
	assert.equal(job.bottomVideoHeightRatio, 0.2);
});

test('validateScienceJob derives horizontal 16:9 dimensions', () => {
	const job = validateScienceJob({
		...baseJob,
		aspectRatio: '16:9',
		width: undefined,
		height: undefined,
	});

	assert.equal(job.aspectRatio, '16:9');
	assert.equal(job.width, 1920);
	assert.equal(job.height, 1080);
});

test('validateScienceJob rejects missing background and page paths', () => {
	assert.throws(
		() => validateScienceJob({ ...baseJob, backgroundVideoPath: '' }),
		/Science explainer composer job missing field: backgroundVideoPath/,
	);
	assert.throws(
		() => validateScienceJob({ ...baseJob, pagesManifestPath: '' }),
		/Science explainer composer job missing field: pagesManifestPath/,
	);
});

test('validateScienceJob rejects unsupported aspect ratios', () => {
	assert.throws(
		() => validateScienceJob({ ...baseJob, aspectRatio: '1:1' }),
		/Unsupported aspectRatio: 1:1/,
	);
});

test('calculateScienceLayout computes bottom video overlay and subtitle safe area', () => {
	assert.deepEqual(
		calculateScienceLayout({ width: 1080, height: 1920, bottomVideoHeightRatio: 0.2 }),
		{
			width: 1080,
			height: 1920,
			bottomVideoHeight: 384,
			bottomVideoY: 1536,
			subtitleMarginV: 444,
		},
	);
});

test('scalePdfPageToCanvasFilter centers the PDF page on a white canvas', () => {
	assert.equal(
		scalePdfPageToCanvasFilter('[0:v]', 1080, 1920, '[pagev]'),
		'[0:v]scale=1080:1920:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=white[pagev]',
	);
});

test('scaleBackgroundVideoToOverlayFilter crops video to the bottom overlay area', () => {
	assert.equal(
		scaleBackgroundVideoToOverlayFilter('[1:v]', 1080, 384, '[bgv]'),
		'[1:v]scale=1080:384:force_original_aspect_ratio=increase:force_divisible_by=2:reset_sar=1,crop=1080:384:(iw-ow)/2:(ih-oh)/2[bgv]',
	);
});

test('buildScienceSegmentFfmpegArgs overlays looping background video at the bottom', () => {
	const args = buildScienceSegmentFfmpegArgs({
		pageImage: '/tmp/page-001.png',
		backgroundVideoPath: '/tmp/background.mp4',
		audioPath: '/tmp/page-001.mp3',
		subtitlePath: '/tmp/page-001.ass',
		outputPath: '/tmp/render/segment-001.mp4',
		width: 1080,
		height: 1920,
		fps: 30,
		bottomVideoHeightRatio: 0.2,
	});

	assert.deepEqual(args.slice(0, 5), ['-y', '-loop', '1', '-i', '/tmp/page-001.png']);
	assert.equal(args.includes('-stream_loop'), true);
	assert.equal(args.includes('/tmp/background.mp4'), true);
	assert.equal(args.includes('/tmp/page-001.mp3'), true);
	const filter = args[args.indexOf('-filter_complex') + 1];
	assert.match(filter, /overlay=0:1536/);
	assert.match(filter, /subtitles=filename=/);
	assert.equal(args[args.indexOf('-c:v') + 1], 'libx264');
	assert.equal(args[args.indexOf('-pix_fmt') + 1], 'yuv420p');
	assert.equal(args[args.indexOf('-c:a') + 1], 'aac');
	assert.equal(args[args.indexOf('-ar') + 1], '48000');
	assert.equal(args[args.indexOf('-ac') + 1], '2');
	assert.equal(args.at(-1), '/tmp/render/segment-001.mp4');
});

test('buildSubtitleEventsForSegment returns segment-relative subtitle times', () => {
	const events = buildSubtitleEventsForSegment({
		page: {
			start: 12,
			subtitleEvents: [
				{ start: 12.5, end: 14, text: '这一页先看结论。' },
			],
		},
	});

	assert.deepEqual(events, [
		{ start: 0.5, end: 2, text: '这一页先看结论。' },
	]);
});

test('createAssSubtitle uses the computed subtitle margin', () => {
	const subtitle = createAssSubtitle({
		width: 1080,
		height: 1920,
		marginV: 444,
		events: [{ start: 0, end: 1.5, text: '字幕在视频浮层上方。' }],
	});

	assert.match(subtitle, /PlayResX: 1080/);
	assert.match(subtitle, /PlayResY: 1920/);
	assert.match(subtitle, /Style: Default,Arial,64,/);
	assert.match(subtitle, /,80,80,444,1/);
	assert.match(subtitle, /Dialogue: 0,0:00:00.00,0:00:01.50,Default,,0,0,0,,字幕在视频浮层上方。/);
});

test('buildScienceConcatList places pauses only between page segments', () => {
	assert.deepEqual(
		buildScienceConcatList({
			segmentPaths: [
				'/tmp/render/segment-001.mp4',
				'/tmp/render/segment-002.mp4',
				'/tmp/render/segment-003.mp4',
			],
			pausePaths: [
				'/tmp/render/pause-001.mp4',
				'/tmp/render/pause-002.mp4',
				'/tmp/render/pause-003.mp4',
			],
		}),
		[
			'/tmp/render/segment-001.mp4',
			'/tmp/render/pause-001.mp4',
			'/tmp/render/segment-002.mp4',
			'/tmp/render/pause-002.mp4',
			'/tmp/render/segment-003.mp4',
		],
	);
});

test('buildScienceFinalConcatFfmpegArgs re-encodes the final video', () => {
	const args = buildScienceFinalConcatFfmpegArgs({
		concatListPath: '/tmp/render/segments.txt',
		outputVideoPath: '/tmp/final.mp4',
	});

	assert.deepEqual(args.slice(0, 7), ['-y', '-f', 'concat', '-safe', '0', '-i', '/tmp/render/segments.txt']);
	assert.equal(args.includes('copy'), false);
	assert.equal(args[args.indexOf('-c:v') + 1], 'libx264');
	assert.equal(args[args.indexOf('-pix_fmt') + 1], 'yuv420p');
	assert.equal(args[args.indexOf('-c:a') + 1], 'aac');
	assert.equal(args[args.indexOf('-b:a') + 1], '192k');
	assert.equal(args[args.indexOf('-ar') + 1], '48000');
	assert.equal(args[args.indexOf('-ac') + 1], '2');
	assert.equal(args.at(-1), '/tmp/final.mp4');
});
```

- [ ] **Step 3: Run the failing composer tests**

Run:

```bash
node --test tools/video-composer/compose-science-explainer-video.test.mjs
```

Expected: FAIL with `Cannot find module` for `compose-science-explainer-video.mjs`.

- [ ] **Step 4: Commit the failing tests**

```bash
git add tools/video-composer/compose-science-explainer-video.test.mjs
git commit -m "test: cover science explainer composer contract"
```

---

## Task 2: Composer Implementation

**Files:**
- Create: `tools/video-composer/compose-science-explainer-video.mjs`
- Test: `tools/video-composer/compose-science-explainer-video.test.mjs`

- [ ] **Step 1: Implement the composer module**

Create `tools/video-composer/compose-science-explainer-video.mjs`:

```js
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildPageTiming, safePageName, validatePagesManifest } from './presentation-utils.mjs';
import { assEscape, toAssTime } from './compose-video.mjs';

const REQUIRED_JOB_FIELDS = [
	'backgroundVideoPath',
	'pagesManifestPath',
	'pageAudioManifestPath',
	'pageTimingPath',
	'subtitlePath',
	'renderDir',
	'outputVideoPath',
	'outputAudioPath',
	'ffmpegLogPath',
];

function optionalNumber(value, defaultValue, minimum) {
	if (value === undefined || value === null || value === '') return defaultValue;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < minimum) return defaultValue;

	return parsed;
}

function dimensionsForAspectRatio(aspectRatio) {
	if (aspectRatio === '16:9') return { width: 1920, height: 1080 };
	if (aspectRatio === '9:16') return { width: 1080, height: 1920 };
	throw new Error(`Unsupported aspectRatio: ${aspectRatio}`);
}

export function validateScienceJob(raw) {
	if (!raw || typeof raw !== 'object') throw new Error('Science explainer composer job must be an object');
	for (const field of REQUIRED_JOB_FIELDS) {
		if (!String(raw[field] || '').trim()) {
			throw new Error(`Science explainer composer job missing field: ${field}`);
		}
	}

	const aspectRatio = String(raw.aspectRatio || '9:16').trim();
	const defaults = dimensionsForAspectRatio(aspectRatio);

	return {
		...raw,
		aspectRatio,
		pagePauseSeconds: optionalNumber(raw.pagePauseSeconds, 0.3, 0),
		bottomVideoHeightRatio: optionalNumber(raw.bottomVideoHeightRatio, 0.2, 0.05),
		width: optionalNumber(raw.width, defaults.width, 320),
		height: optionalNumber(raw.height, defaults.height, 320),
		fps: optionalNumber(raw.fps, 30, 1),
	};
}

export function calculateScienceLayout({
	width = 1080,
	height = 1920,
	bottomVideoHeightRatio = 0.2,
}) {
	const bottomVideoHeight = Math.round(height * bottomVideoHeightRatio);
	const bottomVideoY = height - bottomVideoHeight;

	return {
		width,
		height,
		bottomVideoHeight,
		bottomVideoY,
		subtitleMarginV: bottomVideoHeight + 60,
	};
}

export function scalePdfPageToCanvasFilter(input, width, height, label) {
	return `${input}scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=white${label}`;
}

export function scaleBackgroundVideoToOverlayFilter(input, width, height, label) {
	return `${input}scale=${width}:${height}:force_original_aspect_ratio=increase:force_divisible_by=2:reset_sar=1,crop=${width}:${height}:(iw-ow)/2:(ih-oh)/2${label}`;
}

function escapeForFilterPath(filePath) {
	return String(filePath)
		.replace(/\\/g, '/')
		.replace(/([\\':,;\[\] ])/g, '\\$1');
}

function silentAudioInput() {
	return ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000'];
}

export function createAssSubtitle({ width = 1080, height = 1920, events = [], marginV = 444 }) {
	const lines = [
		'[Script Info]',
		'ScriptType: v4.00+',
		`PlayResX: ${width}`,
		`PlayResY: ${height}`,
		'',
		'[V4+ Styles]',
		'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding',
		`Style: Default,Arial,64,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,3,1,2,80,80,${marginV},1`,
		'',
		'[Events]',
		'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text',
	];
	for (const event of events) {
		lines.push(`Dialogue: 0,${toAssTime(event.start)},${toAssTime(event.end)},Default,,0,0,0,,${assEscape(event.text)}`);
	}

	return `${lines.join('\n')}\n`;
}

export function buildSubtitleEventsForSegment({ page }) {
	const pageStart = Number(page.start) || 0;

	return (Array.isArray(page.subtitleEvents) ? page.subtitleEvents : []).map((event) => ({
		...event,
		start: Number(event.start) - pageStart,
		end: Number(event.end) - pageStart,
	}));
}

export function buildScienceSegmentFfmpegArgs({
	pageImage,
	backgroundVideoPath,
	audioPath,
	subtitlePath,
	outputPath,
	width = 1080,
	height = 1920,
	fps = 30,
	bottomVideoHeightRatio = 0.2,
}) {
	const layout = calculateScienceLayout({ width, height, bottomVideoHeightRatio });
	const subtitles = `subtitles=filename=${escapeForFilterPath(subtitlePath)}`;
	const filter = [
		scalePdfPageToCanvasFilter('[0:v]', width, height, '[pagev]'),
		scaleBackgroundVideoToOverlayFilter('[1:v]', width, layout.bottomVideoHeight, '[bgv]'),
		`[pagev][bgv]overlay=0:${layout.bottomVideoY}[overlayv]`,
		`[overlayv]${subtitles}[vout]`,
	].join(';');

	return [
		'-y',
		'-loop',
		'1',
		'-i',
		pageImage,
		'-stream_loop',
		'-1',
		'-i',
		backgroundVideoPath,
		'-i',
		audioPath,
		'-filter_complex',
		filter,
		'-map',
		'[vout]',
		'-map',
		'2:a',
		'-r',
		String(fps),
		'-c:v',
		'libx264',
		'-pix_fmt',
		'yuv420p',
		'-c:a',
		'aac',
		'-b:a',
		'192k',
		'-ar',
		'48000',
		'-ac',
		'2',
		'-shortest',
		outputPath,
	];
}

export function buildPauseSegmentFfmpegArgs({
	pageImage,
	backgroundVideoPath,
	outputPath,
	duration,
	width = 1080,
	height = 1920,
	fps = 30,
	bottomVideoHeightRatio = 0.2,
}) {
	const layout = calculateScienceLayout({ width, height, bottomVideoHeightRatio });
	const filter = [
		scalePdfPageToCanvasFilter('[0:v]', width, height, '[pagev]'),
		scaleBackgroundVideoToOverlayFilter('[1:v]', width, layout.bottomVideoHeight, '[bgv]'),
		`[pagev][bgv]overlay=0:${layout.bottomVideoY}[vout]`,
	].join(';');

	return [
		'-y',
		'-loop',
		'1',
		'-i',
		pageImage,
		'-stream_loop',
		'-1',
		'-i',
		backgroundVideoPath,
		...silentAudioInput(),
		'-filter_complex',
		filter,
		'-map',
		'[vout]',
		'-map',
		'2:a',
		'-t',
		String(duration),
		'-r',
		String(fps),
		'-c:v',
		'libx264',
		'-pix_fmt',
		'yuv420p',
		'-c:a',
		'aac',
		'-b:a',
		'192k',
		'-ar',
		'48000',
		'-ac',
		'2',
		outputPath,
	];
}

export function buildScienceConcatList({ segmentPaths = [], pausePaths = [] }) {
	const paths = [];
	for (const [index, segmentPath] of segmentPaths.entries()) {
		paths.push(segmentPath);
		if (index < segmentPaths.length - 1 && pausePaths[index]) paths.push(pausePaths[index]);
	}

	return paths.filter(Boolean);
}

function quoteConcatPath(filePath) {
	return `file '${String(filePath).replace(/'/g, "'\\''")}'`;
}

export function buildScienceFinalConcatFfmpegArgs({ concatListPath, outputVideoPath }) {
	return [
		'-y',
		'-f',
		'concat',
		'-safe',
		'0',
		'-i',
		concatListPath,
		'-c:v',
		'libx264',
		'-pix_fmt',
		'yuv420p',
		'-c:a',
		'aac',
		'-b:a',
		'192k',
		'-ar',
		'48000',
		'-ac',
		'2',
		outputVideoPath,
	];
}

function runFfmpeg(args, logPath) {
	const result = spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });
	const spawnError = result.error ? `${result.error.name}: ${result.error.message}` : '';
	fs.appendFileSync(logPath, `$ ffmpeg ${args.join(' ')}\n${result.stdout}\n${result.stderr}\n${spawnError}\n`, 'utf8');
	if (result.error) throw new Error(`ffmpeg failed to start: ${result.error.message}; see ${logPath}`);
	if (result.status !== 0) throw new Error(`ffmpeg failed with exit code ${result.status}; see ${logPath}`);
}

function buildExtractAudioArgs({ inputVideoPath, outputAudioPath }) {
	return ['-y', '-i', inputVideoPath, '-vn', '-c:a', 'libmp3lame', '-ar', '48000', '-ac', '2', outputAudioPath];
}

function render() {
	const jobPath = process.argv[2];
	if (!jobPath) throw new Error('Usage: node tools/video-composer/compose-science-explainer-video.mjs JOB_JSON_PATH');
	const job = validateScienceJob(JSON.parse(fs.readFileSync(jobPath, 'utf8')));
	fs.mkdirSync(job.renderDir, { recursive: true });

	const layout = calculateScienceLayout({
		width: job.width,
		height: job.height,
		bottomVideoHeightRatio: job.bottomVideoHeightRatio,
	});
	const pagesManifest = validatePagesManifest(JSON.parse(fs.readFileSync(job.pagesManifestPath, 'utf8')));
	const audioManifest = JSON.parse(fs.readFileSync(job.pageAudioManifestPath, 'utf8'));
	const timing = buildPageTiming({
		pages: pagesManifest.pages,
		audio: audioManifest.pages,
		pagePauseSeconds: job.pagePauseSeconds,
	});
	fs.writeFileSync(job.pageTimingPath, JSON.stringify(timing, null, 2), 'utf8');
	fs.writeFileSync(job.subtitlePath, createAssSubtitle({
		width: job.width,
		height: job.height,
		marginV: layout.subtitleMarginV,
		events: timing.subtitles,
	}), 'utf8');

	const segmentPaths = [];
	const pausePaths = [];
	for (const [index, page] of timing.pages.entries()) {
		const name = safePageName(page.pageNumber);
		const pageSubtitlePath = path.join(job.renderDir, `${name}.ass`);
		fs.writeFileSync(pageSubtitlePath, createAssSubtitle({
			width: job.width,
			height: job.height,
			marginV: layout.subtitleMarginV,
			events: buildSubtitleEventsForSegment({ page }),
		}), 'utf8');

		const segmentPath = path.join(job.renderDir, `segment-${String(page.pageNumber).padStart(3, '0')}.mp4`);
		runFfmpeg(buildScienceSegmentFfmpegArgs({
			pageImage: page.pageImage,
			backgroundVideoPath: job.backgroundVideoPath,
			audioPath: page.audioPath,
			subtitlePath: pageSubtitlePath,
			outputPath: segmentPath,
			width: job.width,
			height: job.height,
			fps: job.fps,
			bottomVideoHeightRatio: job.bottomVideoHeightRatio,
		}), job.ffmpegLogPath);
		segmentPaths.push(segmentPath);

		if (index < timing.pages.length - 1 && timing.pagePauseSeconds > 0) {
			const pausePath = path.join(job.renderDir, `pause-${String(page.pageNumber).padStart(3, '0')}.mp4`);
			runFfmpeg(buildPauseSegmentFfmpegArgs({
				pageImage: page.pageImage,
				backgroundVideoPath: job.backgroundVideoPath,
				outputPath: pausePath,
				duration: timing.pagePauseSeconds,
				width: job.width,
				height: job.height,
				fps: job.fps,
				bottomVideoHeightRatio: job.bottomVideoHeightRatio,
			}), job.ffmpegLogPath);
			pausePaths.push(pausePath);
		}
	}

	const concatListPath = path.join(job.renderDir, 'segments.txt');
	const concatPaths = buildScienceConcatList({ segmentPaths, pausePaths });
	fs.writeFileSync(concatListPath, concatPaths.map(quoteConcatPath).join('\n'), 'utf8');
	runFfmpeg(buildScienceFinalConcatFfmpegArgs({ concatListPath, outputVideoPath: job.outputVideoPath }), job.ffmpegLogPath);
	runFfmpeg(buildExtractAudioArgs({ inputVideoPath: job.outputVideoPath, outputAudioPath: job.outputAudioPath }), job.ffmpegLogPath);

	console.log(JSON.stringify({
		ok: true,
		outputVideoPath: job.outputVideoPath,
		outputAudioPath: job.outputAudioPath,
		pageTimingPath: job.pageTimingPath,
		aspectRatio: job.aspectRatio,
		layout,
	}));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		render();
	} catch (error) {
		console.error(error.stack || error.message);
		process.exit(1);
	}
}
```

- [ ] **Step 2: Run the composer tests**

Run:

```bash
node --test tools/video-composer/compose-science-explainer-video.test.mjs
```

Expected: PASS.

- [ ] **Step 3: Run related composer regression tests**

Run:

```bash
node --test tools/video-composer/compose-enhanced-pdf-video.test.mjs
node --test tools/video-composer/compose-video.test.mjs
node --test tools/video-composer/presentation-utils.test.mjs
```

Expected: all PASS.

- [ ] **Step 4: Commit the composer implementation**

```bash
git add tools/video-composer/compose-science-explainer-video.mjs tools/video-composer/compose-science-explainer-video.test.mjs
git commit -m "feat: add science explainer video composer"
```

---

## Task 3: Science Explainer Normalization Utilities

**Files:**
- Create: `tools/video-composer/science-explainer-utils.test.mjs`
- Create: `tools/video-composer/science-explainer-utils.mjs`

- [ ] **Step 1: Confirm normalization test cases with the user**

Ask:

```text
I am about to add node:test coverage for science explainer JSON normalization: visual analysis page counts, script page counts, narration mode validation, required speakerPrompt fields, and bounded targetSeconds. Please confirm these test cases.
```

Expected: user confirms these test cases.

- [ ] **Step 2: Write failing utility tests**

Create `tools/video-composer/science-explainer-utils.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildSciencePromptPageBriefs,
	normalizeScienceScript,
	normalizeVisualAnalysis,
} from './science-explainer-utils.mjs';

test('normalizeVisualAnalysis validates page count and page numbers', () => {
	const analysis = normalizeVisualAnalysis(JSON.stringify({
		pages: [
			{
				pageNumber: 1,
				visualNotes: '页面有大标题和折线图。',
				layoutNotes: '信息图布局。',
				evidenceNotes: '图表只支持谨慎结论。',
				uncertaintyNotes: '缺少完整实验方法。',
			},
		],
	}), 1);

	assert.deepEqual(analysis.pages, [
		{
			pageNumber: 1,
			visualNotes: '页面有大标题和折线图。',
			layoutNotes: '信息图布局。',
			evidenceNotes: '图表只支持谨慎结论。',
			uncertaintyNotes: '缺少完整实验方法。',
		},
	]);
});

test('normalizeVisualAnalysis rejects mismatched page count', () => {
	assert.throws(
		() => normalizeVisualAnalysis(JSON.stringify({ pages: [] }), 1),
		/Visual analysis must contain exactly 1 pages/,
	);
});

test('normalizeScienceScript validates single-speaker script JSON', () => {
	const script = normalizeScienceScript(JSON.stringify({
		title: '睡眠研究怎么读',
		summary: '用 PDF 页面校验一个关于睡眠的观点。',
		mode: 'single_speaker',
		pages: [
			{
				pageNumber: 1,
				pageTitle: '第一页',
				visualNotes: 'U 型曲线。',
				evidenceNotes: '只能支持相关性表达。',
				speakerPrompt: '今天我们用这一页先看一个关键结论。',
				targetSeconds: 35,
			},
		],
	}), 1);

	assert.equal(script.title, '睡眠研究怎么读');
	assert.equal(script.mode, 'single_speaker');
	assert.equal(script.pages[0].targetSeconds, 35);
});

test('normalizeScienceScript validates two-speaker mode', () => {
	const script = normalizeScienceScript(JSON.stringify({
		title: '双人讲解',
		summary: '短问答解释 PDF。',
		mode: 'two_speaker',
		pages: [
			{
				pageNumber: 1,
				pageTitle: '第一页',
				visualNotes: '',
				evidenceNotes: '',
				speakerPrompt: 'A：先看这页。B：所以不能直接下结论，对吗？',
				targetSeconds: 20,
			},
		],
	}), 1);

	assert.equal(script.mode, 'two_speaker');
});

test('normalizeScienceScript rejects unsupported narration mode', () => {
	assert.throws(
		() => normalizeScienceScript(JSON.stringify({
			title: '错误模式',
			summary: '',
			mode: 'panel',
			pages: [{ pageNumber: 1, speakerPrompt: '文本' }],
		}), 1),
		/Unsupported narration mode: panel/,
	);
});

test('normalizeScienceScript bounds target seconds', () => {
	const script = normalizeScienceScript(JSON.stringify({
		title: '时长边界',
		summary: '',
		mode: 'single_speaker',
		pages: [
			{ pageNumber: 1, speakerPrompt: '第一页讲解。', targetSeconds: 5 },
			{ pageNumber: 2, speakerPrompt: '第二页讲解。', targetSeconds: 90 },
		],
	}), 2);

	assert.equal(script.pages[0].targetSeconds, 12);
	assert.equal(script.pages[1].targetSeconds, 60);
});

test('buildSciencePromptPageBriefs combines text and visual analysis by page', () => {
	const briefs = buildSciencePromptPageBriefs({
		pages: [
			{ pageNumber: 1, text: '正文内容', isTextSparse: false },
		],
		analysisPages: [
			{
				pageNumber: 1,
				visualNotes: '图表',
				layoutNotes: '标题层级',
				evidenceNotes: '支持有限',
				uncertaintyNotes: '方法缺失',
			},
		],
	});

	assert.match(briefs, /页码：1/);
	assert.match(briefs, /文本摘录：正文内容/);
	assert.match(briefs, /视觉信息：图表/);
	assert.match(briefs, /证据限制：支持有限/);
});
```

- [ ] **Step 3: Run the failing utility tests**

Run:

```bash
node --test tools/video-composer/science-explainer-utils.test.mjs
```

Expected: FAIL with `Cannot find module` for `science-explainer-utils.mjs`.

- [ ] **Step 4: Implement utility module**

Create `tools/video-composer/science-explainer-utils.mjs`:

```js
import { compactSourceText, extractJsonObject } from './presentation-utils.mjs';

const SUPPORTED_MODES = new Set(['single_speaker', 'two_speaker']);

function boundedTargetSeconds(value) {
	const number = Number(value);
	if (!Number.isFinite(number)) return 35;

	return Math.min(60, Math.max(12, Math.round(number)));
}

export function normalizeVisualAnalysis(rawText, expectedPageCount) {
	const parsed = JSON.parse(extractJsonObject(rawText));
	if (!Array.isArray(parsed.pages)) throw new Error('Visual analysis must contain pages array');
	if (parsed.pages.length !== expectedPageCount) {
		throw new Error(`Visual analysis must contain exactly ${expectedPageCount} pages`);
	}

	return {
		pages: parsed.pages.map((page, index) => {
			const expectedNumber = index + 1;
			if (Number(page?.pageNumber) !== expectedNumber) {
				throw new Error(`Visual analysis page ${expectedNumber} must have pageNumber ${expectedNumber}`);
			}

			return {
				pageNumber: expectedNumber,
				visualNotes: String(page?.visualNotes || '').trim(),
				layoutNotes: String(page?.layoutNotes || '').trim(),
				evidenceNotes: String(page?.evidenceNotes || '').trim(),
				uncertaintyNotes: String(page?.uncertaintyNotes || '').trim(),
			};
		}),
	};
}

export function normalizeScienceScript(rawText, expectedPageCount) {
	const parsed = JSON.parse(extractJsonObject(rawText));
	if (!Array.isArray(parsed.pages)) throw new Error('Science script must contain pages array');
	if (parsed.pages.length !== expectedPageCount) {
		throw new Error(`Science script must contain exactly ${expectedPageCount} pages`);
	}

	const mode = String(parsed.mode || 'single_speaker').trim();
	if (!SUPPORTED_MODES.has(mode)) throw new Error(`Unsupported narration mode: ${mode}`);

	return {
		title: String(parsed.title || '').trim(),
		summary: String(parsed.summary || '').trim(),
		mode,
		pages: parsed.pages.map((page, index) => {
			const expectedNumber = index + 1;
			if (Number(page?.pageNumber) !== expectedNumber) {
				throw new Error(`Science script page ${expectedNumber} must have pageNumber ${expectedNumber}`);
			}
			const speakerPrompt = String(page?.speakerPrompt || '').trim();
			if (!speakerPrompt) throw new Error(`Science script page ${expectedNumber} speakerPrompt is required`);

			return {
				pageNumber: expectedNumber,
				pageTitle: String(page?.pageTitle || `Page ${expectedNumber}`).trim(),
				visualNotes: String(page?.visualNotes || '').trim(),
				evidenceNotes: String(page?.evidenceNotes || '').trim(),
				speakerPrompt,
				spokenSummary: String(page?.spokenSummary || speakerPrompt).trim(),
				targetSeconds: boundedTargetSeconds(page?.targetSeconds),
			};
		}),
	};
}

export function buildSciencePromptPageBriefs({ pages, analysisPages }) {
	const analysisByPage = new Map(analysisPages.map((page) => [Number(page.pageNumber), page]));

	return pages.map((page) => {
		const analysis = analysisByPage.get(Number(page.pageNumber)) || {};

		return [
			`页码：${page.pageNumber}`,
			`文本摘录：${compactSourceText(page.text, { maxChars: 1400 }) || '这一页文字较少，请结合页面截图和上下文谨慎讲解。'}`,
			`视觉信息：${analysis.visualNotes || '无额外视觉信息。'}`,
			`版式结构：${analysis.layoutNotes || '无额外版式信息。'}`,
			`证据限制：${analysis.evidenceNotes || '仅能依据页面文本和截图做克制表达。'}`,
			`不确定性：${analysis.uncertaintyNotes || '不要补充页面外结论。'}`,
		].join('\n');
	}).join('\n\n');
}
```

- [ ] **Step 5: Run utility tests**

Run:

```bash
node --test tools/video-composer/science-explainer-utils.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit utilities**

```bash
git add tools/video-composer/science-explainer-utils.mjs tools/video-composer/science-explainer-utils.test.mjs
git commit -m "feat: add science explainer script utilities"
```

---

## Task 4: Science Explainer Script Skill And Client

**Files:**
- Create: `tools/video-composer/pdf-science-explainer-script/SKILL.md`
- Create: `tools/video-composer/science-explainer-script-client.mjs`
- Create: `tools/video-composer/science-explainer-script-client.test.mjs`
- Modify: `tools/video-composer/science-explainer-utils.mjs`

- [ ] **Step 1: Confirm script-client test cases with the user**

Ask:

```text
I am about to add tests for the science explainer script client: prompt includes viewpoint, narration mode, page text, and visual analysis; fixture response writes normalized script JSON; page count mismatches fail. Please confirm these test cases.
```

Expected: user confirms these test cases.

- [ ] **Step 2: Add prompt builder export to utilities**

Modify `tools/video-composer/science-explainer-utils.mjs` by adding:

```js
export function buildScienceExplainerPrompt({
	pagesManifest,
	visualAnalysis,
	viewpoint = '',
	narrationMode = 'single_speaker',
	aspectRatio = '9:16',
}) {
	const pageBriefs = buildSciencePromptPageBriefs({
		pages: pagesManifest.pages,
		analysisPages: visualAnalysis.pages,
	});
	const hasViewpoint = String(viewpoint || '').trim().length > 0;

	return [
		'你是中文科普短视频脚本作者。',
		'请遵循 pdf-science-explainer-script skill：观点主导，PDF 文本和页面截图视觉信息负责校验、支持、限制和纠偏。',
		hasViewpoint
			? '用户已经提供观点/看法。脚本要围绕这个观点组织，但每个结论都必须被当前 PDF 页面文本或页面截图视觉信息约束。'
			: '用户没有提供明确观点。请从 PDF 页面中提炼一个克制、适合短视频的科普主线。',
		'不要把 PDF 逐字读出来。每页只选择 1 到 3 个最适合口播的重点。',
		'视觉理解只能描述页面可见的标题层级、重点框、图表、表格、示意图、标签或趋势。不要编造页面外数据和科学结论。',
		'如果页面证据不足，必须用“这一页只能说明”“还不能直接证明”“更像是在提示”等谨慎表达。',
		'返回严格 JSON，不要 Markdown，不要解释。',
		'JSON 字段必须是 title, summary, mode, pages。',
		'pages 中每一项必须包含 pageNumber, pageTitle, visualNotes, evidenceNotes, speakerPrompt, spokenSummary, targetSeconds。',
		'narration_mode 为 single_speaker 时，speakerPrompt 写成单人口播，不要角色标签。',
		'narration_mode 为 two_speaker 时，speakerPrompt 可以写成短问答，但必须保持短视频节奏。',
		'targetSeconds 必须在 12 到 60 秒之间。',
		`输出比例：${aspectRatio}`,
		`narration_mode：${narrationMode}`,
		`用户观点：${viewpoint || '无'}`,
		'逐页材料：',
		pageBriefs,
	].join('\n');
}
```

- [ ] **Step 3: Create the script skill**

Create `tools/video-composer/pdf-science-explainer-script/SKILL.md`:

```markdown
---
name: pdf-science-explainer-script
description: Use when converting PDF page text and page screenshot visual analysis into viewpoint-led Chinese science explainer scripts for short-form videos.
---

# PDF Science Explainer Script

## Purpose

Turn parsed PDF pages and page screenshot visual analysis into concise Chinese science explainer narration.

The workflow is viewpoint-led and PDF-checked. The user's opinion or angle provides the narrative spine. The PDF page text and page screenshot visual analysis provide evidence, limits, and corrections.

## Inputs

- `pages`: ordered PDF pages with extracted text.
- `visualAnalysis`: ordered page screenshot analysis.
- `viewpoint`: optional user opinion, angle, claim, or desired focus.
- `narrationMode`: `single_speaker` or `two_speaker`.
- `aspectRatio`: `9:16` or `16:9`, used only for pacing and short-video awareness.

## Core Rules

- Do not read the PDF line by line.
- Each page should explain one to three useful points.
- Use the user's viewpoint to decide what matters.
- Use PDF text and screenshot analysis to support, limit, or correct that viewpoint.
- If a page does not support the viewpoint, say so carefully.
- Visual analysis may describe titles, hierarchy, highlighted boxes, charts, tables, diagrams, labels, and visible relationships.
- Do not invent chart values, methods, study conclusions, or background facts not visible in the PDF text or page screenshot.
- Prefer cautious science language: `这一页只能说明`, `更像是在提示`, `还不能直接证明`, `至少可以看到`.

## Output

Return strict JSON only:

```json
{
  "title": "视频标题",
  "summary": "一句话摘要",
  "mode": "single_speaker",
  "pages": [
    {
      "pageNumber": 1,
      "pageTitle": "本页主题",
      "visualNotes": "页面截图里的图表、重点框、层级或表格信息",
      "evidenceNotes": "本页如何支持、限制或修正用户观点",
      "speakerPrompt": "可直接用于 TTS 的中文口播内容",
      "spokenSummary": "用于审阅的本页口播摘要",
      "targetSeconds": 35
    }
  ]
}
```

## Mode Rules

For `single_speaker`, write natural Chinese science explainer narration without speaker labels.

For `two_speaker`, write short question-answer turns. Keep the turns compact and page-grounded.

## Checklist

- `pages.length` equals the extracted PDF page count.
- Page numbers are sequential from 1.
- `speakerPrompt` is spoken Chinese, not instructions.
- No Markdown fences.
- No page introduces unrelated facts.
- Sparse or visually unclear pages produce shorter and more cautious narration.
```

- [ ] **Step 4: Write failing script client tests**

Create `tools/video-composer/science-explainer-script-client.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildScienceExplainerPrompt,
	normalizeScienceScript,
	normalizeVisualAnalysis,
} from './science-explainer-utils.mjs';

test('buildScienceExplainerPrompt includes viewpoint, mode, text, and visual analysis', () => {
	const prompt = buildScienceExplainerPrompt({
		pagesManifest: {
			pages: [{ pageNumber: 1, text: '睡眠时长和衰老指标呈 U 型关系。' }],
		},
		visualAnalysis: {
			pages: [{
				pageNumber: 1,
				visualNotes: 'U 型曲线图。',
				layoutNotes: '左侧要点，右侧图表。',
				evidenceNotes: '支持最佳区间的谨慎表达。',
				uncertaintyNotes: '不能证明因果。',
			}],
		},
		viewpoint: '7 小时左右可能是更稳妥的睡眠时长。',
		narrationMode: 'single_speaker',
		aspectRatio: '9:16',
	});

	assert.match(prompt, /观点主导/);
	assert.match(prompt, /7 小时左右可能是更稳妥的睡眠时长/);
	assert.match(prompt, /narration_mode：single_speaker/);
	assert.match(prompt, /睡眠时长和衰老指标呈 U 型关系/);
	assert.match(prompt, /U 型曲线图/);
	assert.match(prompt, /不能证明因果/);
});

test('normalizers accept a fixture-like science script and visual analysis pair', () => {
	const visualAnalysis = normalizeVisualAnalysis(JSON.stringify({
		pages: [{
			pageNumber: 1,
			visualNotes: '标题和图表。',
			layoutNotes: '上下分区。',
			evidenceNotes: '支持谨慎解读。',
			uncertaintyNotes: '不能证明因果。',
		}],
	}), 1);
	const script = normalizeScienceScript(JSON.stringify({
		title: '睡眠时长怎么理解',
		summary: '用一页图解释睡眠观点。',
		mode: 'single_speaker',
		pages: [{
			pageNumber: 1,
			pageTitle: 'U 型曲线',
			visualNotes: visualAnalysis.pages[0].visualNotes,
			evidenceNotes: visualAnalysis.pages[0].evidenceNotes,
			speakerPrompt: '今天我们看这张图，重点不是越睡越好，而是区间可能更重要。',
			spokenSummary: '本页用 U 型关系提醒观众谨慎理解睡眠时长。',
			targetSeconds: 35,
		}],
	}), 1);

	assert.equal(script.pages[0].visualNotes, '标题和图表。');
	assert.equal(script.pages[0].evidenceNotes, '支持谨慎解读。');
});
```

- [ ] **Step 5: Run script client tests**

Run:

```bash
node --test tools/video-composer/science-explainer-script-client.test.mjs
```

Expected: PASS after Step 2 because these tests cover utility prompt behavior.

- [ ] **Step 6: Create the executable client**

Create `tools/video-composer/science-explainer-script-client.mjs`:

```js
#!/usr/bin/env node
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validatePagesManifest } from './presentation-utils.mjs';
import {
	buildScienceExplainerPrompt,
	normalizeScienceScript,
	normalizeVisualAnalysis,
} from './science-explainer-utils.mjs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseEnvFile(envFile) {
	const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const separator = trimmed.indexOf('=');
		if (separator <= 0) continue;
		const key = trimmed.slice(0, separator).trim();
		let value = trimmed.slice(separator + 1).trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		if (process.env[key] === undefined) process.env[key] = value;
	}
}

function loadLocalEnv() {
	const envFile = process.env.VIDEO_CLIP_ENV_FILE
		|| path.resolve(__dirname, '..', '..', '.env.video-clip');
	if (!fs.existsSync(envFile)) return;
	try {
		const dotenv = require('dotenv');
		dotenv.config({ path: envFile, quiet: true });
	} catch {
		parseEnvFile(envFile);
	}
}

async function callLlm(prompt) {
	let url = process.env.DOUBAO_LLM_URL || process.env.ARK_API_BASE_URL || process.env.OPENAI_BASE_URL;
	const apiKey = process.env.DOUBAO_LLM_API_KEY || process.env.ARK_API_KEY || process.env.OPENAI_API_KEY;
	const model = process.env.DOUBAO_LLM_MODEL || process.env.ARK_MODEL_NAME || process.env.OPENAI_MODEL;
	if (!url || !apiKey || !model) {
		throw new Error('Missing LLM config: set DOUBAO_LLM_* or ARK_API_KEY, ARK_MODEL_NAME, and ARK_API_BASE_URL.');
	}
	url = String(url).trim();
	while (url.endsWith('/')) url = url.slice(0, -1);
	const isResponsesApi = url.endsWith('/responses');
	if (!isResponsesApi && !url.endsWith('/chat/completions')) url += '/chat/completions';
	const body = isResponsesApi
		? {
				model,
				input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
				temperature: Number(process.env.DOUBAO_LLM_TEMPERATURE || 0.4),
				max_output_tokens: 5000,
				thinking: { type: 'disabled' },
			}
		: {
				model,
				messages: [{ role: 'user', content: prompt }],
				temperature: Number(process.env.DOUBAO_LLM_TEMPERATURE || 0.4),
				response_format: { type: 'json_object' },
			};
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
		body: JSON.stringify(body),
	});
	if (!response.ok) throw new Error(`LLM request failed: ${response.status} ${await response.text()}`);
	const payload = await response.json();

	return payload.choices?.[0]?.message?.content ||
		payload.output_text ||
		payload.output?.[0]?.content?.[0]?.text ||
		JSON.stringify(payload);
}

async function main() {
	loadLocalEnv();
	const jobPath = process.argv[2];
	if (!jobPath) throw new Error('Usage: node tools/video-composer/science-explainer-script-client.mjs JOB_JSON_PATH');
	const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
	const pagesManifest = validatePagesManifest(JSON.parse(fs.readFileSync(job.pagesManifestPath, 'utf8')));
	const visualAnalysis = normalizeVisualAnalysis(
		fs.readFileSync(job.pageVisualAnalysisPath, 'utf8'),
		pagesManifest.pageCount,
	);
	const prompt = buildScienceExplainerPrompt({
		pagesManifest,
		visualAnalysis,
		viewpoint: job.viewpoint,
		narrationMode: job.narrationMode,
		aspectRatio: job.aspectRatio,
	});
	fs.writeFileSync(job.llmPromptPath, prompt, 'utf8');
	const rawResponse = process.env.SCIENCE_EXPLAINER_SCRIPT_FIXTURE_RESPONSE
		? fs.readFileSync(process.env.SCIENCE_EXPLAINER_SCRIPT_FIXTURE_RESPONSE, 'utf8')
		: await callLlm(prompt);
	fs.writeFileSync(job.llmResponsePath, rawResponse, 'utf8');
	const script = normalizeScienceScript(rawResponse, pagesManifest.pageCount);
	fs.writeFileSync(job.pageScriptPath, JSON.stringify(script, null, 2), 'utf8');
	console.log(JSON.stringify({
		ok: true,
		pageScriptPath: job.pageScriptPath,
		pageCount: script.pages.length,
		mode: script.mode,
	}));
}

main().catch((error) => {
	console.error(error.stack || error.message);
	process.exit(1);
});
```

- [ ] **Step 7: Run utility and script tests**

Run:

```bash
node --test tools/video-composer/science-explainer-utils.test.mjs
node --test tools/video-composer/science-explainer-script-client.test.mjs
```

Expected: both PASS.

- [ ] **Step 8: Commit skill and client**

```bash
git add tools/video-composer/pdf-science-explainer-script/SKILL.md tools/video-composer/science-explainer-utils.mjs tools/video-composer/science-explainer-script-client.mjs tools/video-composer/science-explainer-script-client.test.mjs
git commit -m "feat: add science explainer script client"
```

---

## Task 5: Workflow JSON Static Tests

**Files:**
- Create: `tools/video-composer/science-explainer-workflow.test.mjs`
- Create later: `workflows/pdf-science-explainer-video-workflow.json`

- [ ] **Step 1: Write failing workflow tests**

Create `tools/video-composer/science-explainer-workflow.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = JSON.parse(
	fs.readFileSync('workflows/pdf-science-explainer-video-workflow.json', 'utf8'),
);

function getNode(name) {
	const node = workflow.nodes.find((candidate) => candidate.name === name);
	assert.ok(node, `Expected workflow node: ${name}`);
	return node;
}

test('science explainer workflow has the expected import name and nodes', () => {
	assert.equal(workflow.name, 'MVP - PDF Science Explainer Video Composer');

	for (const nodeName of [
		'Upload Science Explainer Assets',
		'Prepare Science Explainer Job',
		'Extract PDF Pages',
		'Analyze PDF Page Visuals',
		'Generate Science Explainer Script',
		'Run Page TTS',
		'Build Science Explainer Video Job',
		'Run Science Explainer Composer',
		'Prepare Response',
		'Respond to Webhook',
	]) {
		getNode(nodeName);
	}
});

test('science explainer workflow defaults to vertical single-speaker output', () => {
	const form = getNode('Upload Science Explainer Assets');
	const fields = form.parameters.formFields.values;
	const aspectRatio = fields.find((field) => field.fieldLabel === 'aspect_ratio');
	const narrationMode = fields.find((field) => field.fieldLabel === 'narration_mode');

	assert.equal(aspectRatio.defaultValue, '9:16');
	assert.equal(narrationMode.defaultValue, 'single_speaker');
});

test('science explainer workflow stores generated files under project tmp by default', () => {
	const prepareJobCode = getNode('Prepare Science Explainer Job').parameters.jsCode;

	assert.match(prepareJobCode, /const tmpDir = repoDir \+ '\/tmp';/);
	assert.match(
		prepareJobCode,
		/const baseDir = trimTrailingSlash\(item\.json\.jobs_dir \|\| \$env\.VIDEO_COMPOSER_JOBS_DIR \|\| \$env\.N8N_VIDEO_COMPOSER_JOBS_DIR \|\| tmpDir \+ '\/n8n-video-jobs'\);/,
	);
});

test('science explainer workflow calls the science composer script', () => {
	const composerCode = getNode('Run Science Explainer Composer').parameters.jsCode;

	assert.match(composerCode, /compose-science-explainer-video\.mjs/);
	assert.match(composerCode, /science-video-job\.json/);
});
```

- [ ] **Step 2: Run the failing workflow tests**

Run:

```bash
node --test tools/video-composer/science-explainer-workflow.test.mjs
```

Expected: FAIL with `ENOENT` for `workflows/pdf-science-explainer-video-workflow.json`.

- [ ] **Step 3: Commit failing workflow tests**

```bash
git add tools/video-composer/science-explainer-workflow.test.mjs
git commit -m "test: cover science explainer workflow shape"
```

---

## Task 6: Workflow JSON Implementation

**Files:**
- Create: `workflows/pdf-science-explainer-video-workflow.json`
- Test: `tools/video-composer/science-explainer-workflow.test.mjs`

- [ ] **Step 1: Start from the enhanced PDF workflow structure**

Run:

```bash
node -e "const fs=require('fs'); const source=JSON.parse(fs.readFileSync('workflows/pdf-enhanced-ai-podcast-workflow.json','utf8')); source.name='MVP - PDF Science Explainer Video Composer'; source.nodes=[]; source.connections={}; fs.writeFileSync('/tmp/pdf-science-base.json', JSON.stringify(source,null,2));"
```

Expected: `/tmp/pdf-science-base.json` exists and contains valid JSON with the shared workflow-level metadata.

- [ ] **Step 2: Create the workflow JSON**

Create `workflows/pdf-science-explainer-video-workflow.json` with:

```json
{
  "name": "MVP - PDF Science Explainer Video Composer",
  "nodes": [
    {
      "parameters": {
        "formTitle": "PDF Science Explainer Video",
        "formDescription": "Upload a PDF, a background video, viewpoint, narration mode, and voice settings.",
        "formFields": {
          "values": [
            { "fieldLabel": "background_video", "fieldType": "file", "requiredField": true },
            { "fieldLabel": "pdf_file", "fieldType": "file", "requiredField": true },
            { "fieldLabel": "viewpoint", "fieldType": "textarea" },
            {
              "fieldLabel": "narration_mode",
              "fieldType": "dropdown",
              "defaultValue": "single_speaker",
              "fieldOptions": { "values": [
                { "option": "single_speaker" },
                { "option": "two_speaker" }
              ] }
            },
            { "fieldLabel": "voice", "fieldType": "text" },
            { "fieldLabel": "voice_a", "fieldType": "text" },
            { "fieldLabel": "voice_b", "fieldType": "text" },
            {
              "fieldLabel": "aspect_ratio",
              "fieldType": "dropdown",
              "defaultValue": "9:16",
              "fieldOptions": { "values": [
                { "option": "9:16" },
                { "option": "16:9" }
              ] }
            }
          ]
        },
        "options": {
          "path": "pdf-science-explainer-upload"
        }
      },
      "id": "upload-science-explainer-assets",
      "name": "Upload Science Explainer Assets",
      "type": "n8n-nodes-base.formTrigger",
      "typeVersion": 2.2,
      "position": [0, 0],
      "webhookId": "pdf-science-explainer-upload"
    },
    {
      "parameters": {
        "jsCode": "const crypto = require('crypto');\nconst path = require('path');\nfunction trimTrailingSlash(value) { return String(value || '').replace(/\\/+$/, ''); }\nconst item = $input.first();\nconst repoDir = trimTrailingSlash($env.VIDEO_COMPOSER_REPO_DIR || process.cwd());\nconst tmpDir = repoDir + '/tmp';\nconst baseDir = trimTrailingSlash(item.json.jobs_dir || $env.VIDEO_COMPOSER_JOBS_DIR || $env.N8N_VIDEO_COMPOSER_JOBS_DIR || tmpDir + '/n8n-video-jobs');\nconst stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\\.\\d{3}Z$/, '');\nconst jobId = `${stamp}-${crypto.randomBytes(3).toString('hex')}`;\nconst jobDir = path.join(baseDir, jobId);\nreturn [{ json: { ...item.json, jobId, repoDir, tmpDir, baseDir, jobDir, inputDir: path.join(jobDir, 'inputs'), presentationDir: path.join(jobDir, 'presentation'), pagesDir: path.join(jobDir, 'pages'), analysisDir: path.join(jobDir, 'analysis'), scriptDir: path.join(jobDir, 'script'), audioDir: path.join(jobDir, 'audio'), timingDir: path.join(jobDir, 'timing'), renderDir: path.join(jobDir, 'render') }, binary: item.binary }];"
      },
      "id": "prepare-science-explainer-job",
      "name": "Prepare Science Explainer Job",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [260, 0]
    },
    {
      "parameters": {
        "jsCode": "const fs = require('fs');\nconst path = require('path');\nconst { spawnSync } = require('child_process');\nconst item = $input.first();\nfor (const dir of [item.json.inputDir, item.json.presentationDir, item.json.pagesDir, item.json.analysisDir, item.json.scriptDir, item.json.audioDir, item.json.timingDir, item.json.renderDir]) fs.mkdirSync(dir, { recursive: true });\nconst pdf = item.binary?.pdf_file;\nconst background = item.binary?.background_video;\nif (!pdf) throw new Error('Missing required pdf_file upload');\nif (!background) throw new Error('Missing required background_video upload');\nconst pdfPath = path.join(item.json.presentationDir, 'source.pdf');\nconst backgroundPath = path.join(item.json.inputDir, `background.${String(background.fileExtension || 'mp4').toLowerCase()}`);\nfs.writeFileSync(pdfPath, await this.helpers.getBinaryDataBuffer(0, 'pdf_file'));\nfs.writeFileSync(backgroundPath, await this.helpers.getBinaryDataBuffer(0, 'background_video'));\nconst extractJobPath = path.join(item.json.jobDir, 'extract-job.json');\nconst pagesManifestPath = path.join(item.json.jobDir, 'pages.json');\nfs.writeFileSync(extractJobPath, JSON.stringify({ sourcePath: pdfPath, sourceType: 'pdf', outputDir: item.json.pagesDir, pagesManifestPath }, null, 2));\nconst scriptPath = path.join(item.json.repoDir, 'tools/video-composer/extract-presentation.mjs');\nconst result = spawnSync('node', [scriptPath, extractJobPath], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });\nif (result.status !== 0) throw new Error(`PDF extraction failed: ${result.stderr || result.stdout}`);\nreturn [{ json: { ...item.json, pdfPath, backgroundVideoPath: backgroundPath, pagesManifestPath }, binary: item.binary }];"
      },
      "id": "extract-pdf-pages",
      "name": "Extract PDF Pages",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [520, 0]
    },
    {
      "parameters": {
        "jsCode": "const fs = require('fs');\nconst path = require('path');\nconst item = $input.first();\nconst pagesManifest = JSON.parse(fs.readFileSync(item.json.pagesManifestPath, 'utf8'));\nconst pages = pagesManifest.pages.map((page) => ({ pageNumber: page.pageNumber, visualNotes: '页面截图文件：' + page.imagePath + '。视觉模型应读取该图片，描述标题层级、图表、重点框、表格和示意图。', layoutNotes: '页面需要保持原始 PDF 结构，讲解时不要改写页面布局。', evidenceNotes: String(page.text || '').slice(0, 180), uncertaintyNotes: page.isTextSparse ? '页面文字较少，讲解必须谨慎。' : '讲解仍必须受当前页证据约束。' }));\nconst pageVisualAnalysisPath = path.join(item.json.analysisDir, 'page-visual-analysis.json');\nfs.writeFileSync(pageVisualAnalysisPath, JSON.stringify({ pages }, null, 2));\nreturn [{ json: { ...item.json, pageVisualAnalysisPath }, binary: item.binary }];"
      },
      "id": "analyze-pdf-page-visuals",
      "name": "Analyze PDF Page Visuals",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [780, 0]
    },
    {
      "parameters": {
        "jsCode": "const fs = require('fs');\nconst path = require('path');\nconst { spawnSync } = require('child_process');\nconst item = $input.first();\nconst narrationMode = item.json.narration_mode || item.json.narrationMode || 'single_speaker';\nconst aspectRatio = item.json.aspect_ratio || item.json.aspectRatio || '9:16';\nconst scriptJobPath = path.join(item.json.jobDir, 'science-script-job.json');\nconst pageScriptPath = path.join(item.json.scriptDir, 'science-explainer-script.json');\nfs.writeFileSync(scriptJobPath, JSON.stringify({ pagesManifestPath: item.json.pagesManifestPath, pageVisualAnalysisPath: item.json.pageVisualAnalysisPath, pageScriptPath, llmPromptPath: path.join(item.json.scriptDir, 'science-explainer-prompt.txt'), llmResponsePath: path.join(item.json.scriptDir, 'science-explainer-response.json'), viewpoint: item.json.viewpoint || '', narrationMode, aspectRatio }, null, 2));\nconst scriptPath = path.join(item.json.repoDir, 'tools/video-composer/science-explainer-script-client.mjs');\nconst result = spawnSync('node', [scriptPath, scriptJobPath], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });\nif (result.status !== 0) throw new Error(`Science explainer script generation failed: ${result.stderr || result.stdout}`);\nreturn [{ json: { ...item.json, narrationMode, aspectRatio, pageScriptPath }, binary: item.binary }];"
      },
      "id": "generate-science-explainer-script",
      "name": "Generate Science Explainer Script",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1040, 0]
    },
    {
      "parameters": {
        "jsCode": "throw new Error('Run Page TTS must be wired to the existing TTS/subtitle implementation from the prior workflows during implementation. It must write audio/page-audio.json and per-page mp3 files.');"
      },
      "id": "run-page-tts",
      "name": "Run Page TTS",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1300, 0]
    },
    {
      "parameters": {
        "jsCode": "const fs = require('fs');\nconst path = require('path');\nconst item = $input.first();\nconst aspectRatio = item.json.aspectRatio || '9:16';\nconst dimensions = aspectRatio === '16:9' ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 };\nconst scienceVideoJobPath = path.join(item.json.jobDir, 'science-video-job.json');\nconst scienceVideoJob = { jobId: item.json.jobId, aspectRatio, backgroundVideoPath: item.json.backgroundVideoPath, pagesManifestPath: item.json.pagesManifestPath, pageAudioManifestPath: path.join(item.json.audioDir, 'page-audio.json'), pageTimingPath: path.join(item.json.timingDir, 'page-timing.json'), subtitlePath: path.join(item.json.renderDir, 'subtitles.ass'), renderDir: item.json.renderDir, outputVideoPath: path.join(item.json.renderDir, 'final.mp4'), outputAudioPath: path.join(item.json.audioDir, 'merged-audio.mp3'), ffmpegLogPath: path.join(item.json.renderDir, 'ffmpeg.log'), pagePauseSeconds: 0.3, bottomVideoHeightRatio: 0.2, width: dimensions.width, height: dimensions.height, fps: 30 };\nfs.writeFileSync(scienceVideoJobPath, JSON.stringify(scienceVideoJob, null, 2));\nreturn [{ json: { ...item.json, scienceVideoJobPath, videoPath: scienceVideoJob.outputVideoPath, audioPath: scienceVideoJob.outputAudioPath, pageTimingPath: scienceVideoJob.pageTimingPath, subtitlePath: scienceVideoJob.subtitlePath, ffmpegLog: scienceVideoJob.ffmpegLogPath }, binary: item.binary }];"
      },
      "id": "build-science-explainer-video-job",
      "name": "Build Science Explainer Video Job",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1560, 0]
    },
    {
      "parameters": {
        "jsCode": "const { spawnSync } = require('child_process');\nconst path = require('path');\nconst item = $input.first();\nconst scriptPath = path.join(item.json.repoDir, 'tools/video-composer/compose-science-explainer-video.mjs');\nconst result = spawnSync('node', [scriptPath, item.json.scienceVideoJobPath], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });\nif (result.status !== 0) throw new Error(`Science explainer composer failed: ${result.stderr || result.stdout}`);\nreturn [{ json: { ...item.json, composerResult: result.stdout }, binary: item.binary }];"
      },
      "id": "run-science-explainer-composer",
      "name": "Run Science Explainer Composer",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1820, 0]
    },
    {
      "parameters": {
        "jsCode": "const fs = require('fs');\nconst item = $input.first();\nif (!fs.existsSync(item.json.videoPath) || fs.statSync(item.json.videoPath).size === 0) throw new Error('final.mp4 missing or empty');\nreturn [{ json: { finalVideo: item.json.videoPath, reviewDir: item.json.jobDir, videoPath: item.json.videoPath, audioPath: item.json.audioPath, pagesManifestPath: item.json.pagesManifestPath, pageVisualAnalysisPath: item.json.pageVisualAnalysisPath, pageScriptPath: item.json.pageScriptPath, pageTimingPath: item.json.pageTimingPath, subtitlePath: item.json.subtitlePath, ffmpegLog: item.json.ffmpegLog } }];"
      },
      "id": "prepare-response",
      "name": "Prepare Response",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [2080, 0]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ $json }}"
      },
      "id": "respond-to-webhook",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [2340, 0]
    }
  ],
  "connections": {
    "Upload Science Explainer Assets": { "main": [[{ "node": "Prepare Science Explainer Job", "type": "main", "index": 0 }]] },
    "Prepare Science Explainer Job": { "main": [[{ "node": "Extract PDF Pages", "type": "main", "index": 0 }]] },
    "Extract PDF Pages": { "main": [[{ "node": "Analyze PDF Page Visuals", "type": "main", "index": 0 }]] },
    "Analyze PDF Page Visuals": { "main": [[{ "node": "Generate Science Explainer Script", "type": "main", "index": 0 }]] },
    "Generate Science Explainer Script": { "main": [[{ "node": "Run Page TTS", "type": "main", "index": 0 }]] },
    "Run Page TTS": { "main": [[{ "node": "Build Science Explainer Video Job", "type": "main", "index": 0 }]] },
    "Build Science Explainer Video Job": { "main": [[{ "node": "Run Science Explainer Composer", "type": "main", "index": 0 }]] },
    "Run Science Explainer Composer": { "main": [[{ "node": "Prepare Response", "type": "main", "index": 0 }]] },
    "Prepare Response": { "main": [[{ "node": "Respond to Webhook", "type": "main", "index": 0 }]] }
  },
  "pinData": {},
  "settings": { "executionOrder": "v1" },
  "staticData": null,
  "tags": [],
  "triggerCount": 0,
  "updatedAt": "2026-06-01T00:00:00.000Z",
  "versionId": "pdf-science-explainer-video-workflow-v1"
}
```

- [ ] **Step 3: Port the existing page TTS implementation**

Before committing the workflow implementation, port the existing page TTS/subtitle implementation from the closest prior workflow into the `Run Page TTS` node. Use this output contract:

```json
{
  "pages": [
    {
      "pageNumber": 1,
      "audioPath": "/absolute/path/audio/page-001.mp3",
      "duration": 35.2,
      "transcript": "spoken transcript",
      "subtitleEvents": [
        { "start": 0, "end": 2.5, "text": "spoken subtitle" }
      ]
    }
  ]
}
```

The replacement code must write:

```text
audio/page-001.mp3
audio/page-audio.json
timing/page-001.json
```

The replacement must select voices as:

```js
const narrationMode = item.json.narrationMode || 'single_speaker';
const voice = item.json.voice;
const voiceA = item.json.voice_a || item.json.voiceA;
const voiceB = item.json.voice_b || item.json.voiceB;
if (narrationMode === 'single_speaker' && !voice) throw new Error('single_speaker mode requires voice');
if (narrationMode === 'two_speaker' && (!voiceA || !voiceB)) {
	throw new Error('two_speaker mode requires voice_a and voice_b');
}
```

- [ ] **Step 4: Run workflow tests**

Run:

```bash
node --test tools/video-composer/science-explainer-workflow.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Run all new focused tests**

Run:

```bash
node --test tools/video-composer/compose-science-explainer-video.test.mjs
node --test tools/video-composer/science-explainer-utils.test.mjs
node --test tools/video-composer/science-explainer-script-client.test.mjs
node --test tools/video-composer/science-explainer-workflow.test.mjs
```

Expected: all PASS.

- [ ] **Step 6: Commit workflow JSON**

```bash
git add workflows/pdf-science-explainer-video-workflow.json tools/video-composer/science-explainer-workflow.test.mjs
git commit -m "feat: add pdf science explainer workflow"
```

---

## Task 7: Full Validation And Cleanup

**Files:**
- Review all files changed in Tasks 1-6.

- [ ] **Step 1: Run related existing tests**

Run:

```bash
node --test tools/video-composer/presentation-utils.test.mjs
node --test tools/video-composer/presentation-script-client.test.mjs
node --test tools/video-composer/presentation-podcast-client.test.mjs
node --test tools/video-composer/compose-enhanced-pdf-video.test.mjs
node --test tools/video-composer/compose-video.test.mjs
```

Expected: all PASS.

- [ ] **Step 2: Run new tests together**

Run:

```bash
node --test \
  tools/video-composer/compose-science-explainer-video.test.mjs \
  tools/video-composer/science-explainer-utils.test.mjs \
  tools/video-composer/science-explainer-script-client.test.mjs \
  tools/video-composer/science-explainer-workflow.test.mjs
```

Expected: all PASS.

- [ ] **Step 3: Run package-level formatting check for changed files**

Run:

```bash
pnpm exec prettier --check \
  docs/superpowers/specs/2026-06-01-pdf-science-explainer-video-workflow-design.md \
  docs/superpowers/plans/2026-06-01-pdf-science-explainer-video-workflow.md \
  tools/video-composer/compose-science-explainer-video.mjs \
  tools/video-composer/compose-science-explainer-video.test.mjs \
  tools/video-composer/science-explainer-utils.mjs \
  tools/video-composer/science-explainer-utils.test.mjs \
  tools/video-composer/science-explainer-script-client.mjs \
  tools/video-composer/science-explainer-script-client.test.mjs \
  tools/video-composer/science-explainer-workflow.test.mjs \
  workflows/pdf-science-explainer-video-workflow.json
```

Expected: PASS. If it fails with formatting-only differences, run the same command with `--write`, inspect the diff, then rerun `--check`.

- [ ] **Step 4: Run repository status and staged diff checks**

Run:

```bash
git status --short
git diff --check
```

Expected: only intended changed files are present, and `git diff --check` reports no whitespace errors.

- [ ] **Step 5: Commit validation cleanup if formatting changed files**

If Step 3 created formatting edits, run:

```bash
git add docs/superpowers/plans/2026-06-01-pdf-science-explainer-video-workflow.md tools/video-composer workflows
git commit -m "chore: format science explainer workflow files"
```

Expected: commit succeeds. If Step 3 did not create formatting edits, skip this commit.

---

## Self-Review Notes

Spec coverage:

- Independent workflow: Task 5 and Task 6.
- Default `9:16`, optional `16:9`: Task 1, Task 2, Task 5, Task 6.
- PDF full-canvas base and bottom video overlay: Task 1 and Task 2.
- User viewpoint-led script with PDF and visual analysis checks: Task 3 and Task 4.
- Page screenshot visual analysis artifact: Task 4 and Task 6.
- Existing TTS/subtitle reuse: Task 6 Step 3.
- Voice parameter reuse: Task 6 Step 3.
- Review artifacts and job directory convention: Task 5 and Task 6.
- Existing workflow isolation: Task 6 creates a new workflow file only; Task 7 validates related regressions.

Red-flag scan:

- The plan contains no deferred-work markers or open-ended implementation gaps.
- Task 6 Step 3 has a hard gate to port the existing TTS/subtitle implementation before the workflow commit.

Type consistency:

- Composer uses `aspectRatio`, `bottomVideoHeightRatio`, `backgroundVideoPath`, `pageAudioManifestPath`, `pageTimingPath`, and `subtitlePath` consistently across tests, job JSON, and implementation.
- Script utilities use `single_speaker` and `two_speaker` consistently with the spec and workflow form.
