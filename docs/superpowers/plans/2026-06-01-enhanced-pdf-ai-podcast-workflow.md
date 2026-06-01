# Enhanced PDF AI Podcast Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new importable n8n workflow that reuses the existing AI PDF podcast pipeline and renders an enhanced video with cover intro, illustration intro, page 1 without overlays, and page 2+ with lower-corner overlays.

**Architecture:** Keep `workflows/presentation-ai-podcast-workflow.json` and its composer behavior stable. Add a focused enhanced composer under `tools/video-composer/`, then add a new workflow JSON that mirrors the existing presentation workflow while saving cover and illustration uploads and calling the enhanced composer.

**Tech Stack:** n8n workflow JSON, Node.js ESM, `node:test`, FFmpeg/ffprobe, PyMuPDF PDF extraction, existing Doubao/Volcengine AI Podcast scripts.

---

## File Structure

Create:

- `tools/video-composer/compose-enhanced-pdf-video.mjs`: enhanced video composer for cover intro, illustration intro, page segments, subtitle offset, and final concat.
- `tools/video-composer/compose-enhanced-pdf-video.test.mjs`: focused Node tests for enhanced composer helpers and FFmpeg argument generation.
- `workflows/pdf-enhanced-ai-podcast-workflow.json`: importable n8n workflow.

Modify:

- `docs/video-clip-tts-workflow.md`: add a short section documenting the new enhanced PDF workflow and its review artifacts.

Do not modify:

- `workflows/presentation-ai-podcast-workflow.json`
- `tools/video-composer/compose-presentation-video.mjs`
- `tools/video-composer/presentation-script-client.mjs`
- `tools/video-composer/presentation-podcast-client.mjs`

## Task 1: Add Enhanced Composer Tests

**Files:**

- Create: `tools/video-composer/compose-enhanced-pdf-video.test.mjs`
- Reference: `tools/video-composer/compose-presentation-video.test.mjs`

- [ ] **Step 1: Create the failing test file**

Create `tools/video-composer/compose-enhanced-pdf-video.test.mjs` with this content:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildCoverIntroFfmpegArgs,
	buildEnhancedSegmentFfmpegArgs,
	buildIllustrationIntroFfmpegArgs,
	buildSubtitleEventsForSegment,
	buildEnhancedConcatList,
	scaleImageToCanvasFilter,
	scaleOverlayFilter,
	validateEnhancedJob,
} from './compose-enhanced-pdf-video.mjs';

const baseJob = {
	jobId: 'job-1',
	coverImagePath: '/tmp/cover.png',
	illustrationImagePath: '/tmp/illustration.png',
	pagesManifestPath: '/tmp/pages.json',
	pageAudioManifestPath: '/tmp/page-audio.json',
	pageTimingPath: '/tmp/page-timing.json',
	subtitlePath: '/tmp/subtitles.ass',
	renderDir: '/tmp/render',
	outputVideoPath: '/tmp/final.mp4',
	outputAudioPath: '/tmp/merged-audio.mp3',
	ffmpegLogPath: '/tmp/ffmpeg.log',
	introCoverSeconds: 4,
	introIllustrationSeconds: 4,
	pagePauseSeconds: 0.3,
	overlayWidth: 260,
	width: 1920,
	height: 1080,
	fps: 30,
};

test('validateEnhancedJob returns defaults and required fields', () => {
	const job = validateEnhancedJob(baseJob);

	assert.equal(job.introCoverSeconds, 4);
	assert.equal(job.introIllustrationSeconds, 4);
	assert.equal(job.overlayWidth, 260);
	assert.equal(job.width, 1920);
	assert.equal(job.height, 1080);
	assert.equal(job.fps, 30);
});

test('validateEnhancedJob rejects missing cover and illustration paths', () => {
	assert.throws(
		() => validateEnhancedJob({ ...baseJob, coverImagePath: '' }),
		/Enhanced PDF composer job missing field: coverImagePath/,
	);
	assert.throws(
		() => validateEnhancedJob({ ...baseJob, illustrationImagePath: '' }),
		/Enhanced PDF composer job missing field: illustrationImagePath/,
	);
});

test('scaleImageToCanvasFilter centers images on white canvas without cropping', () => {
	assert.equal(
		scaleImageToCanvasFilter('[0:v]', 1920, 1080, '[coverv]'),
		'[0:v]scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=white[coverv]',
	);
});

test('scaleOverlayFilter creates a stable lower-corner overlay image', () => {
	assert.equal(
		scaleOverlayFilter('[1:v]', 260, '[coverOverlay]'),
		'[1:v]scale=260:-2:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1[coverOverlay]',
	);
});

test('buildCoverIntroFfmpegArgs maps the cover image into a silent intro segment', () => {
	const args = buildCoverIntroFfmpegArgs({
		coverImagePath: '/tmp/cover.png',
		outputPath: '/tmp/render/intro-cover.mp4',
		duration: 4,
		width: 1920,
		height: 1080,
		fps: 30,
	});

	assert.deepEqual(args.slice(0, 5), ['-y', '-loop', '1', '-i', '/tmp/cover.png']);
	assert.equal(args.includes('anullsrc=channel_layout=stereo:sample_rate=24000'), true);
	assert.equal(args.includes('/tmp/render/intro-cover.mp4'), true);
	assert.equal(args[args.indexOf('-t') + 1], '4');
});

test('buildIllustrationIntroFfmpegArgs uses PDF page 1 as background', () => {
	const args = buildIllustrationIntroFfmpegArgs({
		pageImage: '/tmp/page-001.png',
		illustrationImagePath: '/tmp/illustration.png',
		outputPath: '/tmp/render/intro-illustration.mp4',
		duration: 4,
		width: 1920,
		height: 1080,
		fps: 30,
	});

	assert.deepEqual(args.slice(0, 5), ['-y', '-loop', '1', '-i', '/tmp/page-001.png']);
	assert.equal(args.includes('/tmp/illustration.png'), true);
	assert.equal(args.includes('/tmp/render/intro-illustration.mp4'), true);
	assert.match(args[args.indexOf('-filter_complex') + 1], /overlay=\(W-w\)\/2:\(H-h\)\/2/);
});

test('buildEnhancedSegmentFfmpegArgs omits overlays for page 1', () => {
	const args = buildEnhancedSegmentFfmpegArgs({
		pageNumber: 1,
		pageImage: '/tmp/page-001.png',
		audioPath: '/tmp/page-001.mp3',
		subtitlePath: '/tmp/page-001.ass',
		outputPath: '/tmp/render/segment-001.mp4',
		coverImagePath: '/tmp/cover.png',
		illustrationImagePath: '/tmp/illustration.png',
		overlayWidth: 260,
		width: 1920,
		height: 1080,
		fps: 30,
	});

	assert.equal(args.includes('/tmp/cover.png'), false);
	assert.equal(args.includes('/tmp/illustration.png'), false);
	assert.match(args[args.indexOf('-filter_complex') + 1], /subtitles=filename=/);
});

test('buildEnhancedSegmentFfmpegArgs adds lower-corner overlays for page 2', () => {
	const args = buildEnhancedSegmentFfmpegArgs({
		pageNumber: 2,
		pageImage: '/tmp/page-002.png',
		audioPath: '/tmp/page-002.mp3',
		subtitlePath: '/tmp/page-002.ass',
		outputPath: '/tmp/render/segment-002.mp4',
		coverImagePath: '/tmp/cover.png',
		illustrationImagePath: '/tmp/illustration.png',
		overlayWidth: 260,
		width: 1920,
		height: 1080,
		fps: 30,
	});

	assert.equal(args.includes('/tmp/cover.png'), true);
	assert.equal(args.includes('/tmp/illustration.png'), true);
	const filter = args[args.indexOf('-filter_complex') + 1];
	assert.match(filter, /overlay=40:H-h-40/);
	assert.match(filter, /overlay=W-w-40:H-h-40/);
});

test('buildSubtitleEventsForSegment offsets subtitles by intro duration', () => {
	const events = buildSubtitleEventsForSegment({
		page: {
			start: 5,
			subtitleEvents: [
				{ start: 5.5, end: 7, text: '第二页开始。' },
			],
		},
		introDuration: 8,
	});

	assert.deepEqual(events, [
		{ start: 13.5, end: 15, text: '第二页开始。' },
	]);
});

test('buildEnhancedConcatList orders intro segments before page segments and pauses', () => {
	assert.deepEqual(
		buildEnhancedConcatList({
			introCoverPath: '/tmp/render/intro-cover.mp4',
			introIllustrationPath: '/tmp/render/intro-illustration.mp4',
			segmentPaths: ['/tmp/render/segment-001.mp4', '/tmp/render/segment-002.mp4'],
			pausePaths: ['/tmp/render/pause-001.mp4'],
		}),
		[
			'/tmp/render/intro-cover.mp4',
			'/tmp/render/intro-illustration.mp4',
			'/tmp/render/segment-001.mp4',
			'/tmp/render/pause-001.mp4',
			'/tmp/render/segment-002.mp4',
		],
	);
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
node --test tools/video-composer/compose-enhanced-pdf-video.test.mjs
```

Expected: FAIL with an import error for `tools/video-composer/compose-enhanced-pdf-video.mjs`.

- [ ] **Step 3: Commit the failing tests**

```bash
git add tools/video-composer/compose-enhanced-pdf-video.test.mjs
git commit -m "test: add enhanced pdf composer expectations"
```

## Task 2: Implement Enhanced Composer Helper Functions

**Files:**

- Create: `tools/video-composer/compose-enhanced-pdf-video.mjs`
- Test: `tools/video-composer/compose-enhanced-pdf-video.test.mjs`

- [ ] **Step 1: Create the enhanced composer module with exported helpers**

Create `tools/video-composer/compose-enhanced-pdf-video.mjs` with the helper layer below:

```js
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { buildPageTiming, safePageName, validatePagesManifest } from './presentation-utils.mjs';
import { assEscape, toAssTime } from './compose-video.mjs';

const REQUIRED_JOB_FIELDS = [
	'coverImagePath',
	'illustrationImagePath',
	'pagesManifestPath',
	'pageAudioManifestPath',
	'pageTimingPath',
	'subtitlePath',
	'renderDir',
	'outputVideoPath',
	'outputAudioPath',
	'ffmpegLogPath',
];

export function validateEnhancedJob(raw) {
	if (!raw || typeof raw !== 'object') throw new Error('Enhanced PDF composer job must be an object');
	for (const field of REQUIRED_JOB_FIELDS) {
		if (!String(raw[field] || '').trim()) {
			throw new Error(`Enhanced PDF composer job missing field: ${field}`);
		}
	}

	return {
		...raw,
		introCoverSeconds: Math.max(0, Number(raw.introCoverSeconds ?? 4) || 0),
		introIllustrationSeconds: Math.max(0, Number(raw.introIllustrationSeconds ?? 4) || 0),
		pagePauseSeconds: Math.max(0, Number(raw.pagePauseSeconds ?? 0.3) || 0),
		overlayWidth: Math.max(80, Number(raw.overlayWidth ?? 260) || 260),
		width: Math.max(320, Number(raw.width ?? 1920) || 1920),
		height: Math.max(240, Number(raw.height ?? 1080) || 1080),
		fps: Math.max(1, Number(raw.fps ?? 30) || 30),
	};
}

export function scaleImageToCanvasFilter(input, width, height, label) {
	return `${input}scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=white${label}`;
}

export function scaleOverlayFilter(input, overlayWidth, label) {
	return `${input}scale=${overlayWidth}:-2:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1${label}`;
}

function escapeForFilterPath(filePath) {
	return String(filePath)
		.replace(/\\/g, '/')
		.replace(/([\\':,;[\] ])/g, '\\$1');
}

function silentAudioInput() {
	return ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=24000'];
}

export function createAssSubtitle({ width = 1920, height = 1080, events = [], marginV = 90 }) {
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

export function buildCoverIntroFfmpegArgs({
	coverImagePath,
	outputPath,
	duration,
	width = 1920,
	height = 1080,
	fps = 30,
}) {
	const filter = scaleImageToCanvasFilter('[0:v]', width, height, '[vout]');

	return [
		'-y',
		'-loop',
		'1',
		'-i',
		coverImagePath,
		...silentAudioInput(),
		'-filter_complex',
		filter,
		'-map',
		'[vout]',
		'-map',
		'1:a',
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
		outputPath,
	];
}

export function buildIllustrationIntroFfmpegArgs({
	pageImage,
	illustrationImagePath,
	outputPath,
	duration,
	width = 1920,
	height = 1080,
	fps = 30,
}) {
	const filter = [
		scaleImageToCanvasFilter('[0:v]', width, height, '[pagev]'),
		scaleOverlayFilter('[1:v]', Math.round(width * 0.55), '[illustrationv]'),
		'[pagev][illustrationv]overlay=(W-w)/2:(H-h)/2[vout]',
	].join(';');

	return [
		'-y',
		'-loop',
		'1',
		'-i',
		pageImage,
		'-loop',
		'1',
		'-i',
		illustrationImagePath,
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
		outputPath,
	];
}

export function buildEnhancedSegmentFfmpegArgs({
	pageNumber,
	pageImage,
	audioPath,
	subtitlePath,
	outputPath,
	coverImagePath,
	illustrationImagePath,
	overlayWidth = 260,
	width = 1920,
	height = 1080,
	fps = 30,
}) {
	const subtitles = `subtitles=filename=${escapeForFilterPath(subtitlePath)}`;
	const baseInputs = ['-y', '-loop', '1', '-i', pageImage, '-i', audioPath];
	if (Number(pageNumber) === 1) {
		const filter = `${scaleImageToCanvasFilter('[0:v]', width, height, '[pagev]')};[pagev]${subtitles}[vout]`;

		return [
			...baseInputs,
			'-filter_complex',
			filter,
			'-map',
			'[vout]',
			'-map',
			'1:a',
			'-r',
			String(fps),
			'-c:v',
			'libx264',
			'-pix_fmt',
			'yuv420p',
			'-c:a',
			'aac',
			'-shortest',
			outputPath,
		];
	}

	const filter = [
		scaleImageToCanvasFilter('[0:v]', width, height, '[pagev]'),
		scaleOverlayFilter('[2:v]', overlayWidth, '[coverOverlay]'),
		scaleOverlayFilter('[3:v]', overlayWidth, '[illustrationOverlay]'),
		'[pagev][coverOverlay]overlay=40:H-h-40[leftv]',
		'[leftv][illustrationOverlay]overlay=W-w-40:H-h-40[overlayv]',
		`[overlayv]${subtitles}[vout]`,
	].join(';');

	return [
		...baseInputs,
		'-loop',
		'1',
		'-i',
		coverImagePath,
		'-loop',
		'1',
		'-i',
		illustrationImagePath,
		'-filter_complex',
		filter,
		'-map',
		'[vout]',
		'-map',
		'1:a',
		'-r',
		String(fps),
		'-c:v',
		'libx264',
		'-pix_fmt',
		'yuv420p',
		'-c:a',
		'aac',
		'-shortest',
		outputPath,
	];
}

export function buildPauseSegmentFfmpegArgs({
	pageImage,
	outputPath,
	duration,
	width = 1920,
	height = 1080,
	fps = 30,
}) {
	const filter = scaleImageToCanvasFilter('[0:v]', width, height, '[vout]');

	return [
		'-y',
		'-loop',
		'1',
		'-i',
		pageImage,
		...silentAudioInput(),
		'-filter_complex',
		filter,
		'-map',
		'[vout]',
		'-map',
		'1:a',
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
		outputPath,
	];
}

export function buildSubtitleEventsForSegment({ page, introDuration }) {
	const intro = Number(introDuration) || 0;

	return (Array.isArray(page.subtitleEvents) ? page.subtitleEvents : []).map((event) => ({
		...event,
		start: Number(event.start) + intro,
		end: Number(event.end) + intro,
	}));
}

export function buildEnhancedConcatList({
	introCoverPath,
	introIllustrationPath,
	segmentPaths = [],
	pausePaths = [],
}) {
	const paths = [introCoverPath, introIllustrationPath];
	for (const [index, segmentPath] of segmentPaths.entries()) {
		paths.push(segmentPath);
		if (pausePaths[index]) paths.push(pausePaths[index]);
	}

	return paths.filter(Boolean);
}

function quoteConcatPath(filePath) {
	return `file '${String(filePath).replace(/'/g, "'\\''")}'`;
}

function runFfmpeg(args, logPath) {
	const result = spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });
	fs.appendFileSync(logPath, `$ ffmpeg ${args.join(' ')}\n${result.stdout}\n${result.stderr}\n`, 'utf8');
	if (result.status !== 0) throw new Error(`ffmpeg failed with exit code ${result.status}; see ${logPath}`);
}

function buildExtractAudioArgs({ inputVideoPath, outputAudioPath }) {
	return ['-y', '-i', inputVideoPath, '-vn', '-c:a', 'libmp3lame', outputAudioPath];
}
```

- [ ] **Step 2: Run the enhanced composer tests**

Run:

```bash
node --test tools/video-composer/compose-enhanced-pdf-video.test.mjs
```

Expected: PASS.

- [ ] **Step 3: Commit the helper implementation**

```bash
git add tools/video-composer/compose-enhanced-pdf-video.mjs tools/video-composer/compose-enhanced-pdf-video.test.mjs
git commit -m "feat: add enhanced pdf composer helpers"
```

## Task 3: Implement Enhanced Composer Render Flow

**Files:**

- Modify: `tools/video-composer/compose-enhanced-pdf-video.mjs`
- Modify: `tools/video-composer/compose-enhanced-pdf-video.test.mjs`

- [ ] **Step 1: Add a test for renderable timeline data**

Append this test to `tools/video-composer/compose-enhanced-pdf-video.test.mjs`:

```js
test('buildEnhancedConcatList places page pause only between page segments', () => {
	assert.deepEqual(
		buildEnhancedConcatList({
			introCoverPath: '/tmp/render/intro-cover.mp4',
			introIllustrationPath: '/tmp/render/intro-illustration.mp4',
			segmentPaths: [
				'/tmp/render/segment-001.mp4',
				'/tmp/render/segment-002.mp4',
				'/tmp/render/segment-003.mp4',
			],
			pausePaths: [
				'/tmp/render/pause-001.mp4',
				'/tmp/render/pause-002.mp4',
			],
		}),
		[
			'/tmp/render/intro-cover.mp4',
			'/tmp/render/intro-illustration.mp4',
			'/tmp/render/segment-001.mp4',
			'/tmp/render/pause-001.mp4',
			'/tmp/render/segment-002.mp4',
			'/tmp/render/pause-002.mp4',
			'/tmp/render/segment-003.mp4',
		],
	);
});
```

- [ ] **Step 2: Run the test**

Run:

```bash
node --test tools/video-composer/compose-enhanced-pdf-video.test.mjs
```

Expected: PASS. This test documents the render order before wiring the CLI path.

- [ ] **Step 3: Add the CLI render function**

Append this code to `tools/video-composer/compose-enhanced-pdf-video.mjs`:

```js
function render() {
	const jobPath = process.argv[2];
	if (!jobPath) throw new Error('Usage: node tools/video-composer/compose-enhanced-pdf-video.mjs JOB_JSON_PATH');
	const job = validateEnhancedJob(JSON.parse(fs.readFileSync(jobPath, 'utf8')));
	fs.mkdirSync(job.renderDir, { recursive: true });

	const pagesManifest = validatePagesManifest(JSON.parse(fs.readFileSync(job.pagesManifestPath, 'utf8')));
	const audioManifest = JSON.parse(fs.readFileSync(job.pageAudioManifestPath, 'utf8'));
	const timing = buildPageTiming({
		pages: pagesManifest.pages,
		audio: audioManifest.pages,
		pagePauseSeconds: job.pagePauseSeconds,
	});
	fs.writeFileSync(job.pageTimingPath, JSON.stringify(timing, null, 2), 'utf8');

	const introDuration = job.introCoverSeconds + job.introIllustrationSeconds;
	fs.writeFileSync(job.subtitlePath, createAssSubtitle({
		width: job.width,
		height: job.height,
		marginV: job.overlayWidth + 80,
		events: timing.subtitles.map((event) => ({
			...event,
			start: Number(event.start) + introDuration,
			end: Number(event.end) + introDuration,
		})),
	}), 'utf8');

	const introCoverPath = path.join(job.renderDir, 'intro-cover.mp4');
	runFfmpeg(buildCoverIntroFfmpegArgs({
		coverImagePath: job.coverImagePath,
		outputPath: introCoverPath,
		duration: job.introCoverSeconds,
		width: job.width,
		height: job.height,
		fps: job.fps,
	}), job.ffmpegLogPath);

	const firstPage = pagesManifest.pages[0];
	if (!firstPage) throw new Error('Enhanced PDF composer requires at least one PDF page');
	const introIllustrationPath = path.join(job.renderDir, 'intro-illustration.mp4');
	runFfmpeg(buildIllustrationIntroFfmpegArgs({
		pageImage: firstPage.imagePath,
		illustrationImagePath: job.illustrationImagePath,
		outputPath: introIllustrationPath,
		duration: job.introIllustrationSeconds,
		width: job.width,
		height: job.height,
		fps: job.fps,
	}), job.ffmpegLogPath);

	const segmentPaths = [];
	const pausePaths = [];
	for (const page of timing.pages) {
		const name = safePageName(page.pageNumber);
		const pageSubtitlePath = path.join(job.renderDir, `${name}.ass`);
		fs.writeFileSync(pageSubtitlePath, createAssSubtitle({
			width: job.width,
			height: job.height,
			marginV: page.pageNumber === 1 ? 90 : job.overlayWidth + 80,
			events: page.subtitleEvents.map((event) => ({
				...event,
				start: Number(event.start) - page.start,
				end: Number(event.end) - page.start,
			})),
		}), 'utf8');

		const segmentPath = path.join(job.renderDir, `segment-${String(page.pageNumber).padStart(3, '0')}.mp4`);
		runFfmpeg(buildEnhancedSegmentFfmpegArgs({
			pageNumber: page.pageNumber,
			pageImage: page.pageImage,
			audioPath: page.audioPath,
			subtitlePath: pageSubtitlePath,
			outputPath: segmentPath,
			coverImagePath: job.coverImagePath,
			illustrationImagePath: job.illustrationImagePath,
			overlayWidth: job.overlayWidth,
			width: job.width,
			height: job.height,
			fps: job.fps,
		}), job.ffmpegLogPath);
		segmentPaths.push(segmentPath);

		if (page.pageNumber < timing.pages.length && timing.pagePauseSeconds > 0) {
			const pausePath = path.join(job.renderDir, `pause-${String(page.pageNumber).padStart(3, '0')}.mp4`);
			runFfmpeg(buildPauseSegmentFfmpegArgs({
				pageImage: page.pageImage,
				outputPath: pausePath,
				duration: timing.pagePauseSeconds,
				width: job.width,
				height: job.height,
				fps: job.fps,
			}), job.ffmpegLogPath);
			pausePaths.push(pausePath);
		}
	}

	const concatListPath = path.join(job.renderDir, 'segments.txt');
	const concatPaths = buildEnhancedConcatList({ introCoverPath, introIllustrationPath, segmentPaths, pausePaths });
	fs.writeFileSync(concatListPath, concatPaths.map(quoteConcatPath).join('\n'), 'utf8');
	runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', job.outputVideoPath], job.ffmpegLogPath);
	runFfmpeg(buildExtractAudioArgs({ inputVideoPath: job.outputVideoPath, outputAudioPath: job.outputAudioPath }), job.ffmpegLogPath);

	console.log(JSON.stringify({
		ok: true,
		outputVideoPath: job.outputVideoPath,
		outputAudioPath: job.outputAudioPath,
		pageTimingPath: job.pageTimingPath,
		introDuration,
	}));
}

if (process.argv[1] && process.argv[1].endsWith('compose-enhanced-pdf-video.mjs')) {
	try {
		render();
	} catch (error) {
		console.error(error.stack || error.message);
		process.exit(1);
	}
}
```

- [ ] **Step 4: Run composer tests**

Run:

```bash
node --test tools/video-composer/compose-enhanced-pdf-video.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Run existing related composer tests**

Run:

```bash
node --test tools/video-composer/compose-presentation-video.test.mjs
node --test tools/video-composer/presentation-utils.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit render flow**

```bash
git add tools/video-composer/compose-enhanced-pdf-video.mjs tools/video-composer/compose-enhanced-pdf-video.test.mjs
git commit -m "feat: render enhanced pdf podcast video"
```

## Task 4: Add New Enhanced PDF Workflow JSON

**Files:**

- Create: `workflows/pdf-enhanced-ai-podcast-workflow.json`
- Reference: `workflows/presentation-ai-podcast-workflow.json`

- [ ] **Step 1: Create a workflow-generation script in a temporary file**

Create `/tmp/create-enhanced-pdf-workflow.mjs` with this content:

```js
import fs from 'node:fs';

const sourcePath = 'workflows/presentation-ai-podcast-workflow.json';
const targetPath = 'workflows/pdf-enhanced-ai-podcast-workflow.json';
const workflow = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

workflow.id = 'pdf-enhanced-ai-podcast-workflow';
workflow.name = 'MVP - Enhanced PDF AI Podcast Video Composer';
workflow.versionId = 'pdf-enhanced-ai-podcast-workflow-v1';

const upload = workflow.nodes.find((node) => node.name === 'Upload Presentation');
const existingPodcastFields = upload.parameters.formFields.values.filter((field) => (
	['podcast_speaker_a', 'podcast_speaker_b', 'podcast_style'].includes(field.fieldLabel)
));
upload.name = 'Upload Enhanced PDF Assets';
upload.parameters.path = 'pdf-enhanced-ai-podcast-upload';
upload.webhookId = 'pdf-enhanced-ai-podcast-upload';
upload.parameters.formTitle = 'Enhanced PDF AI Podcast Video Composer';
upload.parameters.formDescription = 'Upload a cover image, an illustration image, and a PDF to generate a rigorous page-by-page AI podcast explanation video.';
upload.parameters.formFields.values = [
	{ fieldLabel: 'cover_image', fieldType: 'file', requiredField: true },
	{ fieldLabel: 'illustration_image', fieldType: 'file', requiredField: true },
	{ fieldLabel: 'pdf_file', fieldType: 'file', requiredField: true },
	{
		fieldLabel: 'extra_context',
		fieldType: 'textarea',
		requiredField: false,
		placeholder: '可选：补充受众、观点、讲解重点或语气要求。论文/科普内容会默认采用严谨逐页讲解。',
	},
	...existingPodcastFields,
];

const prepare = workflow.nodes.find((node) => node.name === 'Prepare Job');
prepare.name = 'Prepare Enhanced PDF Job';
prepare.parameters.jsCode = String.raw`const fs = require('fs');
const path = require('path');
const item = $input.first();
const binary = item.binary || {};
function trimTrailingSlash(value) { let text = String(value || ''); while (text.endsWith('/')) text = text.slice(0, -1); return text; }
function cleanText(value) { const lf = String.fromCharCode(10); const cr = String.fromCharCode(13); let text = String(value || '').split(String.fromCharCode(0)).join('').split(cr + lf).join(lf).split(cr).join(lf); while (text.includes(lf + lf + lf)) text = text.split(lf + lf + lf).join(lf + lf); return text.trim(); }
function normalizeChoice(value, fallback) { const text = String(value || '').trim(); if (!text) return fallback; const separatorIndex = text.lastIndexOf('｜'); return separatorIndex >= 0 ? text.slice(separatorIndex + 1).trim() : text; }
function extensionFromUpload(key) {
  const meta = binary[key] || {};
  const name = String(meta.fileName || '').toLowerCase();
  for (const extension of ['.png', '.jpg', '.jpeg', '.webp', '.pdf']) {
    if (name.endsWith(extension)) return extension;
  }
  const mime = String(meta.mimeType || '').toLowerCase();
  if (mime.includes('png')) return '.png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('pdf')) return '.pdf';
  return '';
}
function requireUpload(key) {
  if (!binary[key]) throw new Error('Missing uploaded file: ' + key);
  return key;
}
function requireImageExtension(key) {
  const extension = extensionFromUpload(key);
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) throw new Error(key + ' must be a PNG, JPG, JPEG, or WEBP image.');
  return extension;
}
const coverKey = requireUpload('cover_image');
const illustrationKey = requireUpload('illustration_image');
const pdfKey = requireUpload('pdf_file');
const coverExtension = requireImageExtension(coverKey);
const illustrationExtension = requireImageExtension(illustrationKey);
const pdfExtension = extensionFromUpload(pdfKey);
if (pdfExtension !== '.pdf') throw new Error('pdf_file must be a PDF file.');
const now = new Date();
const stamp = now.toISOString().slice(0, 19).split('-').join('').split(':').join('').split('T').join('-');
const random = Math.random().toString(16).slice(2, 8).padEnd(6, '0');
const jobId = stamp + '-' + random;
const repoDir = trimTrailingSlash(item.json.repo_dir || '/Users/stephenqiu/Desktop/Repository/n8n');
const baseDir = trimTrailingSlash(item.json.jobs_dir || repoDir + '/tmp/n8n-video-jobs');
const jobDir = baseDir + '/' + jobId;
const inputsDir = jobDir + '/inputs';
const presentationDir = jobDir + '/presentation';
const pagesDir = jobDir + '/pages';
const scriptDir = jobDir + '/script';
const audioDir = jobDir + '/audio';
const timingDir = jobDir + '/timing';
const transcriptDir = jobDir + '/transcript';
const renderDir = jobDir + '/render';
for (const dir of [inputsDir, presentationDir, pagesDir, scriptDir, audioDir, timingDir, transcriptDir, renderDir]) fs.mkdirSync(dir, { recursive: true });
const coverImagePath = path.join(inputsDir, 'cover' + coverExtension);
const illustrationImagePath = path.join(inputsDir, 'illustration' + illustrationExtension);
const sourcePath = path.join(presentationDir, 'source.pdf');
fs.writeFileSync(coverImagePath, await this.helpers.getBinaryDataBuffer(0, coverKey));
fs.writeFileSync(illustrationImagePath, await this.helpers.getBinaryDataBuffer(0, illustrationKey));
fs.writeFileSync(sourcePath, await this.helpers.getBinaryDataBuffer(0, pdfKey));
const paths = {
  coverImagePath,
  illustrationImagePath,
  sourcePath,
  pagesManifestPath: jobDir + '/pages.json',
  pageScriptPath: scriptDir + '/page-script.json',
  llmPromptPath: scriptDir + '/prompt.txt',
  llmResponsePath: scriptDir + '/response.json',
  pageAudioManifestPath: audioDir + '/page-audio.json',
  pageTimingPath: timingDir + '/page-timing.json',
  subtitlePath: renderDir + '/subtitles.ass',
  outputVideoPath: renderDir + '/final.mp4',
  outputAudioPath: audioDir + '/merged-audio.mp3',
  ffmpegLogPath: renderDir + '/ffmpeg.log',
  costPath: jobDir + '/cost.json'
};
const podcastSpeakerA = normalizeChoice(item.json.podcast_speaker_a, 'zh_male_wennuanahu_uranus_bigtts');
const podcastSpeakerB = normalizeChoice(item.json.podcast_speaker_b, 'zh_female_yingyujiaoxue_uranus_bigtts');
const podcastStyle = item.json.podcast_style || 'podcast_interview';
const userContext = cleanText(item.json.extra_context);
const rigorousScienceContext = [
  '请采用严谨科普/论文逐页讲解方式。',
  '每页只解释当前页面可验证的信息、术语、图表标签、公式、主张和轻微上下文。',
  '讲清楚这一页支持什么，以及不能单独证明什么。',
  userContext
].filter(Boolean).join('\\n');
const extractJobPath = jobDir + '/extract-job.json';
const scriptJobPath = jobDir + '/script-job.json';
const podcastJobPath = jobDir + '/podcast-job.json';
const composerJobPath = jobDir + '/composer-job.json';
fs.writeFileSync(extractJobPath, JSON.stringify({ jobId, sourcePath, presentationDir, pagesDir, pagesManifestPath: paths.pagesManifestPath }, null, 2));
fs.writeFileSync(scriptJobPath, JSON.stringify({ jobId, pagesManifestPath: paths.pagesManifestPath, pageScriptPath: paths.pageScriptPath, llmPromptPath: paths.llmPromptPath, llmResponsePath: paths.llmResponsePath, extraContext: rigorousScienceContext, podcastStyle }, null, 2));
fs.writeFileSync(podcastJobPath, JSON.stringify({ jobId, pageScriptPath: paths.pageScriptPath, audioDir, timingDir, transcriptDir, pageAudioManifestPath: paths.pageAudioManifestPath, costPath: paths.costPath, podcastSpeakerA, podcastSpeakerB }, null, 2));
return [{ json: { ...item.json, jobId, repoDir, baseDir, jobDir, inputsDir, presentationDir, pagesDir, scriptDir, audioDir, timingDir, transcriptDir, renderDir, ...paths, extractJobPath, scriptJobPath, podcastJobPath, composerJobPath, extraContext: rigorousScienceContext, podcastSpeakerA, podcastSpeakerB, podcastStyle } }];`;

for (const node of workflow.nodes) {
	if (node.name === 'Convert Presentation') node.name = 'Extract PDF Pages';
	if (node.name === 'Build Presentation Job') {
		node.name = 'Build Enhanced PDF Video Job';
		node.parameters.jsCode = String.raw`const fs = require('fs');
const item = $input.first().json;
const job = {
  jobId: item.jobId,
  coverImagePath: item.coverImagePath,
  illustrationImagePath: item.illustrationImagePath,
  pagesManifestPath: item.pagesManifestPath,
  pageAudioManifestPath: item.pageAudioManifestPath,
  pageTimingPath: item.pageTimingPath,
  subtitlePath: item.subtitlePath,
  renderDir: item.renderDir,
  outputVideoPath: item.outputVideoPath,
  outputAudioPath: item.outputAudioPath,
  ffmpegLogPath: item.ffmpegLogPath,
  introCoverSeconds: Number(item.intro_cover_seconds || 4),
  introIllustrationSeconds: Number(item.intro_illustration_seconds || 4),
  pagePauseSeconds: Number(item.page_pause_seconds || 0.3),
  overlayWidth: Number(item.overlay_width || 260),
  width: Number(item.video_width || 1920),
  height: Number(item.video_height || 1080),
  fps: Number(item.video_fps || 30)
};
fs.writeFileSync(item.composerJobPath, JSON.stringify(job, null, 2));
return [{ json: { ...item, composerJob: job } }];`;
	}
	if (node.name === 'Run Presentation Composer') {
		node.name = 'Run Enhanced PDF Composer';
		node.parameters.jsCode = node.parameters.jsCode.replace(
			'compose-presentation-video.mjs',
			'compose-enhanced-pdf-video.mjs',
		).replace('Presentation composer failed', 'Enhanced PDF composer failed');
	}
	if (node.name === 'Prepare Response') {
		node.parameters.jsCode = node.parameters.jsCode.replace(
			'jobId: item.jobId, reviewDir: item.jobDir, videoPath: item.outputVideoPath, audioPath: item.outputAudioPath, pageScriptPath: item.pageScriptPath',
			'jobId: item.jobId, reviewDir: item.jobDir, videoPath: item.outputVideoPath, audioPath: item.outputAudioPath, coverImagePath: item.coverImagePath, illustrationImagePath: item.illustrationImagePath, pagesManifestPath: item.pagesManifestPath, pageScriptPath: item.pageScriptPath',
		);
	}
	if (node.name === 'Respond to Webhook') {
		node.parameters.responseBody = "={{ { ok: true, jobId: $json.jobId, reviewDir: $json.reviewDir, videoPath: $json.videoPath, audioPath: $json.audioPath, coverImagePath: $json.coverImagePath, illustrationImagePath: $json.illustrationImagePath, pagesManifestPath: $json.pagesManifestPath, pageScriptPath: $json.pageScriptPath, pageTimingPath: $json.pageTimingPath, subtitlePath: $json.subtitlePath, costPath: $json.costPath, ffmpegLog: $json.ffmpegLog, size: $json.size, pageCount: $json.pageCount, totalDuration: $json.totalDuration, generatedScriptTitle: $json.generatedScriptTitle, generatedScriptSummary: $json.generatedScriptSummary, cost: $json.cost } }}";
	}
}

workflow.connections = JSON.parse(JSON.stringify(workflow.connections)
	.replaceAll('Upload Presentation', 'Upload Enhanced PDF Assets')
	.replaceAll('Prepare Job', 'Prepare Enhanced PDF Job')
	.replaceAll('Convert Presentation', 'Extract PDF Pages')
	.replaceAll('Build Presentation Job', 'Build Enhanced PDF Video Job')
	.replaceAll('Run Presentation Composer', 'Run Enhanced PDF Composer'));

fs.writeFileSync(targetPath, `${JSON.stringify(workflow, null, 2)}\n`);
```

- [ ] **Step 2: Generate the workflow JSON**

Run:

```bash
node /tmp/create-enhanced-pdf-workflow.mjs
```

Expected: creates `workflows/pdf-enhanced-ai-podcast-workflow.json`.

- [ ] **Step 3: Validate JSON parses**

Run:

```bash
node -e "const fs=require('fs'); const workflow=JSON.parse(fs.readFileSync('workflows/pdf-enhanced-ai-podcast-workflow.json','utf8')); console.log(workflow.name, workflow.nodes.length)"
```

Expected output starts with:

```text
MVP - Enhanced PDF AI Podcast Video Composer
```

- [ ] **Step 4: Inspect the new workflow for required nodes and fields**

Run:

```bash
node - <<'NODE'
const fs = require('fs');
const workflow = JSON.parse(fs.readFileSync('workflows/pdf-enhanced-ai-podcast-workflow.json', 'utf8'));
const names = workflow.nodes.map((node) => node.name);
for (const name of [
  'Upload Enhanced PDF Assets',
  'Prepare Enhanced PDF Job',
  'Extract PDF Pages',
  'Generate Page Podcast Script',
  'Run Page AI Podcast',
  'Build Enhanced PDF Video Job',
  'Run Enhanced PDF Composer',
  'Prepare Response',
  'Respond to Webhook',
]) {
  if (!names.includes(name)) throw new Error('Missing node: ' + name);
}
const upload = workflow.nodes.find((node) => node.name === 'Upload Enhanced PDF Assets');
const fields = upload.parameters.formFields.values.map((field) => field.fieldLabel);
for (const field of ['cover_image', 'illustration_image', 'pdf_file']) {
  if (!fields.includes(field)) throw new Error('Missing field: ' + field);
}
console.log('enhanced workflow ok');
NODE
```

Expected:

```text
enhanced workflow ok
```

- [ ] **Step 5: Commit the workflow**

```bash
git add workflows/pdf-enhanced-ai-podcast-workflow.json
git commit -m "feat: add enhanced pdf podcast workflow"
```

## Task 5: Document The Enhanced Workflow

**Files:**

- Modify: `docs/video-clip-tts-workflow.md`

- [ ] **Step 1: Add a documentation section**

Insert this section after the existing `Presentation AI Podcast Workflow` section in `docs/video-clip-tts-workflow.md`:

```md
## Enhanced PDF AI Podcast Workflow

The enhanced PDF version is `workflows/pdf-enhanced-ai-podcast-workflow.json`.
It reuses the existing PDF parsing, rigorous page-grounded script generation,
and per-page AI Podcast synthesis from the presentation workflow, then renders a
new video package with uploaded cover and illustration assets.

The form accepts:

- `cover_image`: `png`, `jpg`, `jpeg`, or `webp`
- `illustration_image`: `png`, `jpg`, `jpeg`, or `webp`
- `pdf_file`: `pdf`
- optional `extra_context`
- `podcast_speaker_a`
- `podcast_speaker_b`
- `podcast_style`

The output timeline is:

- `0s - 4s`: silent cover intro
- `4s - 8s`: silent illustration intro over PDF page 1
- page 1 explanation: PDF page 1 only
- page 2 and later explanations: current PDF page with cover lower-left and
  illustration lower-right

Review artifacts are written to `tmp/n8n-video-jobs/{jobId}`. The most useful
files are `pages.json`, `script/page-script.json`, `audio/page-*.mp3`,
`timing/page-timing.json`, `render/intro-cover.mp4`,
`render/intro-illustration.mp4`, `render/segment-*.mp4`, `render/final.mp4`,
and `cost.json`.
```

- [ ] **Step 2: Run Markdown and whitespace checks**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 3: Commit docs**

```bash
git add docs/video-clip-tts-workflow.md
git commit -m "docs: document enhanced pdf podcast workflow"
```

## Task 6: Run Validation Suite

**Files:**

- Test: `tools/video-composer/compose-enhanced-pdf-video.test.mjs`
- Test: `tools/video-composer/compose-presentation-video.test.mjs`
- Test: `tools/video-composer/presentation-utils.test.mjs`
- Test: `tools/video-composer/presentation-script-client.test.mjs`
- Test: `tools/video-composer/presentation-podcast-client.test.mjs`
- Test: `workflows/pdf-enhanced-ai-podcast-workflow.json`

- [ ] **Step 1: Run enhanced composer tests**

```bash
node --test tools/video-composer/compose-enhanced-pdf-video.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run existing related tests**

```bash
node --test tools/video-composer/compose-presentation-video.test.mjs
node --test tools/video-composer/presentation-utils.test.mjs
node --test tools/video-composer/presentation-script-client.test.mjs
node --test tools/video-composer/presentation-podcast-client.test.mjs
```

Expected: all PASS.

- [ ] **Step 3: Validate workflow JSON again**

```bash
node - <<'NODE'
const fs = require('fs');
for (const file of [
  'workflows/presentation-ai-podcast-workflow.json',
  'workflows/pdf-enhanced-ai-podcast-workflow.json',
]) {
  const workflow = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) throw new Error(file + ' has no nodes');
  if (!workflow.connections || typeof workflow.connections !== 'object') throw new Error(file + ' has no connections');
  console.log(file + ' ok');
}
NODE
```

Expected:

```text
workflows/presentation-ai-podcast-workflow.json ok
workflows/pdf-enhanced-ai-podcast-workflow.json ok
```

- [ ] **Step 4: Check final diff**

```bash
git status --short
git diff --check
```

Expected: `git diff --check` exits 0. `git status --short` shows only intentional committed or uncommitted files for this feature.

- [ ] **Step 5: Commit validation-only fixes if needed**

If Step 4 shows validation fixes made after prior commits, commit them:

```bash
git add tools/video-composer/compose-enhanced-pdf-video.mjs tools/video-composer/compose-enhanced-pdf-video.test.mjs workflows/pdf-enhanced-ai-podcast-workflow.json docs/video-clip-tts-workflow.md
git commit -m "fix: polish enhanced pdf podcast workflow"
```

Expected: commit only if files changed after the previous task commits.
