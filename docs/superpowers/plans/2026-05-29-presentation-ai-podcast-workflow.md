# Presentation AI Podcast Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new importable n8n workflow that accepts a PDF or PPTX, generates page-by-page AI Podcast narration, and renders a full-screen slide explanation video with aligned subtitles.

**Architecture:** Keep the existing video-clip workflows stable. Add focused presentation helpers under `tools/video-composer/`, reuse the existing AI Podcast client and subtitle timing utilities, and add a new workflow JSON that orchestrates upload, extraction, script generation, per-page audio, timeline building, and final rendering. The renderer is page-segment based so each page can be reviewed independently.

**Tech Stack:** n8n Form Trigger and Code nodes, Node.js ESM scripts, FFmpeg/ffprobe, LibreOffice for PPTX-to-PDF conversion, Poppler tools for PDF page images/text, Doubao/Volcengine LLM, Doubao/Volcengine AI Podcast WebSocket.

---

## File Structure

- Create `tools/video-composer/presentation-utils.mjs`
  - Pure helpers for validating page metadata, extracting strict JSON from LLM responses, cleaning transcripts, offsetting subtitle events, aggregating costs, and building concat files.
- Create `tools/video-composer/presentation-utils.test.mjs`
  - Unit tests for all pure helpers without network, FFmpeg, LibreOffice, or n8n.
- Create `tools/video-composer/extract-presentation.mjs`
  - CLI script that reads a job JSON, normalizes PDF/PPTX into `pages.json`, renders page PNGs, extracts per-page text, and fails with actionable messages.
- Create `tools/video-composer/extract-presentation.test.mjs`
  - CLI validation tests and fixture-driven tests for file type detection and converter command planning.
- Create `tools/video-composer/presentation-script-client.mjs`
  - CLI script that calls the configured Doubao/Volcengine LLM, writes `script/page-script.json`, and validates page count/page numbers.
- Create `tools/video-composer/presentation-script-client.test.mjs`
  - Tests for prompt construction, strict JSON parsing, and page count validation.
- Create `tools/video-composer/presentation-podcast-client.mjs`
  - CLI wrapper that calls `ai-podcast-client.mjs` once per page and writes page-specific audio/timing/transcript/cost artifacts.
- Create `tools/video-composer/presentation-podcast-client.test.mjs`
  - Offline fixture tests for per-page job generation, output validation, cost aggregation, and page-numbered errors.
- Create `tools/video-composer/compose-presentation-video.mjs`
  - CLI renderer that creates `merged-audio.mp3`, `render/subtitles.ass`, one segment per page, and `render/final.mp4`.
- Create `tools/video-composer/compose-presentation-video.test.mjs`
  - Tests for FFmpeg argument generation, page scaling rules, ASS subtitle generation, and final concat manifest.
- Create `workflows/presentation-ai-podcast-workflow.json`
  - Importable n8n workflow with form path `presentation-ai-podcast-upload`.
- Modify `.env.video-clip.example`
  - Document presentation workflow dependencies and optional LLM/Podcast variables already consumed by the scripts.
- Modify `docs/video-clip-tts-workflow.md`
  - Add a short sibling-workflow section that points to the presentation AI Podcast workflow and its review artifacts.

## Task 1: Presentation Utility Contract

**Files:**
- Create: `tools/video-composer/presentation-utils.mjs`
- Create: `tools/video-composer/presentation-utils.test.mjs`

- [ ] **Step 1: Write failing utility tests**

Create `tools/video-composer/presentation-utils.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
	aggregatePresentationCost,
	buildPageTiming,
	cleanSpokenTranscript,
	extractJsonObject,
	normalizePageScript,
	offsetSubtitleEvents,
	safePageName,
	validatePagesManifest,
} from './presentation-utils.mjs';

test('safePageName pads page numbers', () => {
	assert.equal(safePageName(1), 'page-001');
	assert.equal(safePageName(12), 'page-012');
});

test('validatePagesManifest accepts sequential extracted pages', () => {
	const manifest = validatePagesManifest({
		sourceType: 'pdf',
		pageCount: 2,
		pages: [
			{ pageNumber: 1, imagePath: '/tmp/page-001.png', textPath: '/tmp/page-001.txt', text: '标题', isTextSparse: false },
			{ pageNumber: 2, imagePath: '/tmp/page-002.png', textPath: '/tmp/page-002.txt', text: '', isTextSparse: true },
		],
	});

	assert.equal(manifest.pageCount, 2);
	assert.equal(manifest.pages[1].isTextSparse, true);
});

test('validatePagesManifest rejects non-sequential page numbers', () => {
	assert.throws(
		() => validatePagesManifest({
			sourceType: 'pdf',
			pageCount: 2,
			pages: [
				{ pageNumber: 1, imagePath: '/tmp/page-001.png', textPath: '/tmp/page-001.txt' },
				{ pageNumber: 3, imagePath: '/tmp/page-003.png', textPath: '/tmp/page-003.txt' },
			],
		}),
		/Page 2 must have pageNumber 2/,
	);
});

test('extractJsonObject removes markdown fences around strict JSON', () => {
	const raw = '```json\\n{\"title\":\"测试\",\"pages\":[]}\\n```';
	assert.equal(extractJsonObject(raw), '{"title":"测试","pages":[]}');
});

test('normalizePageScript validates one script entry per page', () => {
	const script = normalizePageScript(JSON.stringify({
		title: '测试课件',
		summary: '简介',
		audience: '普通听众',
		pages: [
			{ pageNumber: 1, pageTitle: '第一页', speakerPrompt: '今天我们要聊的话题是第一页。', spokenSummary: '第一页', targetSeconds: 30 },
			{ pageNumber: 2, pageTitle: '第二页', speakerPrompt: '接下来这一页解释第二点。', spokenSummary: '第二页', targetSeconds: 25 },
		],
	}), 2);

	assert.equal(script.pages.length, 2);
	assert.match(script.pages[0].speakerPrompt, /今天我们要聊/);
});

test('cleanSpokenTranscript removes prompt and JSON wrappers', () => {
	const text = cleanSpokenTranscript('```json\\n{\"speakerPrompt\":\"请你生成播客\",\"text\":\"今天我们要聊的话题是增长。\"}\\n```');
	assert.equal(text, '今天我们要聊的话题是增长。');
});

test('offsetSubtitleEvents shifts per-page events by cumulative start', () => {
	assert.deepEqual(offsetSubtitleEvents([{ text: '你好', start: 0.5, end: 1.5 }], 10), [
		{ text: '你好', start: 10.5, end: 11.5 },
	]);
});

test('buildPageTiming uses audio durations plus pauses as authoritative timeline', () => {
	const timing = buildPageTiming({
		pages: [
			{ pageNumber: 1, imagePath: '/tmp/page-001.png' },
			{ pageNumber: 2, imagePath: '/tmp/page-002.png' },
		],
		audio: [
			{ pageNumber: 1, audioPath: '/tmp/page-001.mp3', duration: 10, transcript: '一', subtitleEvents: [{ text: '一', start: 0, end: 1 }] },
			{ pageNumber: 2, audioPath: '/tmp/page-002.mp3', duration: 20, transcript: '二', subtitleEvents: [{ text: '二', start: 0, end: 2 }] },
		],
		pagePauseSeconds: 0.3,
	});

	assert.equal(timing.totalDuration, 30.3);
	assert.equal(timing.pages[1].start, 10.3);
	assert.deepEqual(timing.subtitles.map((event) => event.text), ['一', '二']);
	assert.equal(timing.subtitles[1].start, 10.3);
});

test('aggregatePresentationCost sums available page podcast usage', () => {
	const cost = aggregatePresentationCost({
		jobId: 'job-1',
		pageCosts: [
			{ aiPodcast: { totalTokens: 1000, estimatedCostCny: 0.07 } },
			{ aiPodcast: { totalTokens: 2000, estimatedCostCny: 0.14 } },
		],
		pageCount: 2,
		totalAudioDuration: 30,
	});

	assert.equal(cost.totalTokens, 3000);
	assert.equal(cost.totalEstimatedCostCny, 0.21);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test tools/video-composer/presentation-utils.test.mjs
```

Expected: FAIL with `Cannot find module` for `presentation-utils.mjs`.

- [ ] **Step 3: Implement pure utility helpers**

Create `tools/video-composer/presentation-utils.mjs`:

```js
export function safePageName(pageNumber) {
	const number = Number(pageNumber);
	if (!Number.isInteger(number) || number <= 0) throw new Error(`Invalid page number: ${pageNumber}`);
	return `page-${String(number).padStart(3, '0')}`;
}

export function validatePagesManifest(raw) {
	if (!raw || typeof raw !== 'object') throw new Error('pages.json must be an object');
	if (!['pdf', 'pptx'].includes(raw.sourceType)) throw new Error(`Unsupported sourceType: ${raw.sourceType || '(empty)'}`);
	const pageCount = Number(raw.pageCount);
	if (!Number.isInteger(pageCount) || pageCount <= 0) throw new Error('pages.json pageCount must be a positive integer');
	if (!Array.isArray(raw.pages) || raw.pages.length !== pageCount) {
		throw new Error(`pages.json must contain exactly ${pageCount} pages`);
	}

	return {
		sourceType: raw.sourceType,
		pageCount,
		pages: raw.pages.map((page, index) => {
			const expectedNumber = index + 1;
			const pageNumber = Number(page?.pageNumber);
			if (pageNumber !== expectedNumber) throw new Error(`Page ${expectedNumber} must have pageNumber ${expectedNumber}`);
			const imagePath = String(page?.imagePath || '').trim();
			const textPath = String(page?.textPath || '').trim();
			if (!imagePath) throw new Error(`Page ${expectedNumber} imagePath is required`);
			if (!textPath) throw new Error(`Page ${expectedNumber} textPath is required`);
			const text = String(page?.text || '').trim();
			return {
				pageNumber,
				imagePath,
				textPath,
				text,
				isTextSparse: Boolean(page?.isTextSparse ?? text.length < 20),
			};
		}),
	};
}

export function extractJsonObject(text) {
	const raw = String(text ?? '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
	const start = raw.indexOf('{');
	if (start === -1) throw new Error('LLM response did not contain a JSON object');
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let index = start; index < raw.length; index += 1) {
		const char = raw[index];
		if (inString) {
			if (escaped) escaped = false;
			else if (char === '\\') escaped = true;
			else if (char === '"') inString = false;
			continue;
		}
		if (char === '"') inString = true;
		else if (char === '{') depth += 1;
		else if (char === '}') {
			depth -= 1;
			if (depth === 0) return raw.slice(start, index + 1);
		}
	}
	throw new Error('LLM response contained an incomplete JSON object');
}

function boundedTargetSeconds(value) {
	const number = Number(value);
	if (!Number.isFinite(number)) return 30;
	return Math.min(60, Math.max(12, Math.round(number)));
}

export function normalizePageScript(rawText, expectedPageCount) {
	const parsed = JSON.parse(extractJsonObject(rawText));
	if (!Array.isArray(parsed.pages)) throw new Error('Page script must contain pages array');
	if (parsed.pages.length !== expectedPageCount) {
		throw new Error(`Page script must contain exactly ${expectedPageCount} pages`);
	}
	return {
		title: String(parsed.title || '').trim(),
		summary: String(parsed.summary || '').trim(),
		audience: String(parsed.audience || '').trim(),
		pages: parsed.pages.map((page, index) => {
			const expectedNumber = index + 1;
			if (Number(page?.pageNumber) !== expectedNumber) {
				throw new Error(`Script page ${expectedNumber} must have pageNumber ${expectedNumber}`);
			}
			const speakerPrompt = String(page?.speakerPrompt || '').trim();
			if (!speakerPrompt) throw new Error(`Script page ${expectedNumber} speakerPrompt is required`);
			return {
				pageNumber: expectedNumber,
				pageTitle: String(page?.pageTitle || `Page ${expectedNumber}`).trim(),
				speakerPrompt,
				spokenSummary: String(page?.spokenSummary || '').trim(),
				targetSeconds: boundedTargetSeconds(page?.targetSeconds),
			};
		}),
	};
}

export function cleanSpokenTranscript(text) {
	const raw = String(text || '').trim();
	if (!raw) return '';
	try {
		const parsed = JSON.parse(extractJsonObject(raw));
		const value = parsed.text ?? parsed.transcript ?? parsed.spokenSummary;
		if (typeof value === 'string') return value.trim();
	} catch {}
	return raw
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/\s*```$/i, '')
		.replace(/^speakerPrompt[:：].*$/gim, '')
		.replace(/^system[:：].*$/gim, '')
		.replace(/^prompt[:：].*$/gim, '')
		.trim();
}

export function offsetSubtitleEvents(events, offsetSeconds) {
	const offset = Number(offsetSeconds) || 0;
	return (Array.isArray(events) ? events : [])
		.map((event) => ({
			text: cleanSpokenTranscript(event?.text),
			start: Number(event?.start) + offset,
			end: Number(event?.end) + offset,
		}))
		.filter((event) => event.text && Number.isFinite(event.start) && Number.isFinite(event.end) && event.end > event.start);
}

export function buildPageTiming({ pages, audio, pagePauseSeconds = 0.3 }) {
	const audioByPage = new Map(audio.map((entry) => [Number(entry.pageNumber), entry]));
	const pause = Math.max(0, Number(pagePauseSeconds) || 0);
	let cursor = 0;
	const subtitles = [];
	const timedPages = pages.map((page, index) => {
		const pageNumber = Number(page.pageNumber);
		const item = audioByPage.get(pageNumber);
		if (!item) throw new Error(`Missing audio timing for page ${pageNumber}`);
		const duration = Number(item.duration);
		if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Invalid audio duration for page ${pageNumber}`);
		const start = cursor;
		const end = start + duration;
		const pageSubtitles = offsetSubtitleEvents(item.subtitleEvents, start);
		subtitles.push(...pageSubtitles);
		cursor = end + (index === pages.length - 1 ? 0 : pause);
		return {
			pageNumber,
			pageImage: page.imagePath,
			audioPath: item.audioPath,
			start,
			end,
			duration,
			transcript: cleanSpokenTranscript(item.transcript),
			subtitleEvents: pageSubtitles,
		};
	});
	return {
		pagePauseSeconds: pause,
		totalDuration: Number(cursor.toFixed(3)),
		pages: timedPages,
		subtitles,
	};
}

export function aggregatePresentationCost({ jobId, pageCosts = [], llmUsage = null, pageCount = 0, totalAudioDuration = 0 }) {
	let totalTokens = 0;
	let totalEstimatedCostCny = 0;
	for (const cost of pageCosts) {
		totalTokens += Number(cost?.aiPodcast?.totalTokens || cost?.aiPodcast?.total_tokens || 0);
		totalEstimatedCostCny += Number(cost?.aiPodcast?.estimatedCostCny || 0);
	}
	return {
		jobId,
		pageCount,
		totalAudioDuration,
		llm: llmUsage || { usageUnavailable: true },
		pageCosts,
		totalTokens,
		totalEstimatedCostCny: Number(totalEstimatedCostCny.toFixed(6)),
	};
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
node --test tools/video-composer/presentation-utils.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/video-composer/presentation-utils.mjs tools/video-composer/presentation-utils.test.mjs
git commit -m "feat: add presentation workflow utilities"
```

## Task 2: Presentation Extraction CLI

**Files:**
- Create: `tools/video-composer/extract-presentation.mjs`
- Create: `tools/video-composer/extract-presentation.test.mjs`

- [ ] **Step 1: Write failing CLI tests**

Create `tools/video-composer/extract-presentation.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const scriptPath = new URL('./extract-presentation.mjs', import.meta.url).pathname;

function makeTmpJob(inputName) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'presentation-extract-'));
	const presentationDir = path.join(root, 'presentation');
	const pagesDir = path.join(root, 'pages');
	fs.mkdirSync(presentationDir, { recursive: true });
	fs.mkdirSync(pagesDir, { recursive: true });
	const sourcePath = path.join(presentationDir, inputName);
	fs.writeFileSync(sourcePath, 'fixture');
	const jobPath = path.join(root, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'extract-test',
		sourcePath,
		presentationDir,
		pagesDir,
		pagesManifestPath: path.join(root, 'pages.json'),
	}, null, 2));
	return { root, jobPath };
}

test('extract-presentation rejects unsupported file types', () => {
	const { jobPath } = makeTmpJob('source.txt');
	const result = spawnSync('node', [scriptPath, jobPath], { encoding: 'utf8' });
	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /Only PDF and PPTX files are supported/);
});

test('extract-presentation can run with fixture pages for offline tests', () => {
	const { root, jobPath } = makeTmpJob('source.pdf');
	const fixturePath = path.join(root, 'fixture-pages.json');
	fs.writeFileSync(fixturePath, JSON.stringify({
		sourceType: 'pdf',
		pages: [
			{ text: '第一页标题' },
			{ text: '' },
		],
	}));
	const result = spawnSync('node', [scriptPath, jobPath], {
		encoding: 'utf8',
		env: { ...process.env, PRESENTATION_EXTRACT_FIXTURE: fixturePath },
	});
	assert.equal(result.status, 0, result.stderr);
	const manifest = JSON.parse(fs.readFileSync(path.join(root, 'pages.json'), 'utf8'));
	assert.equal(manifest.pageCount, 2);
	assert.equal(manifest.pages[0].text, '第一页标题');
	assert.equal(manifest.pages[1].isTextSparse, true);
	assert.equal(fs.existsSync(manifest.pages[0].imagePath), true);
	assert.equal(fs.existsSync(manifest.pages[0].textPath), true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test tools/video-composer/extract-presentation.test.mjs
```

Expected: FAIL with `Cannot find module` for `extract-presentation.mjs`.

- [ ] **Step 3: Implement extraction CLI**

Create `tools/video-composer/extract-presentation.mjs`:

```js
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { safePageName, validatePagesManifest } from './presentation-utils.mjs';

function usage() {
	console.error('Usage: node tools/video-composer/extract-presentation.mjs JOB_JSON_PATH');
	process.exit(1);
}

function run(command, args, options = {}) {
	const result = spawnSync(command, args, { encoding: 'utf8', ...options });
	if (result.status !== 0) {
		throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
	}
	return result.stdout;
}

function extensionOf(filePath) {
	return path.extname(String(filePath || '')).toLowerCase();
}

function writeFixturePages(job, fixturePath, sourceType) {
	const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
	const pages = fixture.pages.map((page, index) => {
		const pageNumber = index + 1;
		const name = safePageName(pageNumber);
		const imagePath = path.join(job.pagesDir, `${name}.png`);
		const textPath = path.join(job.pagesDir, `${name}.txt`);
		fs.writeFileSync(imagePath, Buffer.from('89504e470d0a1a0a', 'hex'));
		const text = String(page.text || '').trim();
		fs.writeFileSync(textPath, text, 'utf8');
		return { pageNumber, imagePath, textPath, text, isTextSparse: text.length < 20 };
	});
	return validatePagesManifest({ sourceType, pageCount: pages.length, pages });
}

function convertPptxToPdf(job) {
	fs.mkdirSync(job.presentationDir, { recursive: true });
	run('soffice', [
		'--headless',
		'--convert-to',
		'pdf',
		'--outdir',
		job.presentationDir,
		job.sourcePath,
	]);
	const baseName = path.basename(job.sourcePath, path.extname(job.sourcePath));
	const convertedPath = path.join(job.presentationDir, `${baseName}.pdf`);
	if (!fs.existsSync(convertedPath)) {
		throw new Error(`LibreOffice did not create converted PDF: ${convertedPath}`);
	}
	return convertedPath;
}

function extractPdf(job, pdfPath, sourceType) {
	fs.mkdirSync(job.pagesDir, { recursive: true });
	const prefix = path.join(job.pagesDir, 'page');
	run('pdftoppm', ['-png', '-r', '180', pdfPath, prefix]);
	run('pdftotext', ['-layout', pdfPath, path.join(job.pagesDir, 'all-pages.txt')]);
	const images = fs.readdirSync(job.pagesDir)
		.filter((file) => /^page-\d+\.png$/.test(file))
		.sort();
	if (images.length === 0) throw new Error('PDF extraction produced no page images');
	const allText = fs.existsSync(path.join(job.pagesDir, 'all-pages.txt'))
		? fs.readFileSync(path.join(job.pagesDir, 'all-pages.txt'), 'utf8')
		: '';
	const textPages = allText.split(/\f/g);
	const pages = images.map((imageFile, index) => {
		const pageNumber = index + 1;
		const name = safePageName(pageNumber);
		const imagePath = path.join(job.pagesDir, `${name}.png`);
		fs.renameSync(path.join(job.pagesDir, imageFile), imagePath);
		const text = String(textPages[index] || '').trim();
		const textPath = path.join(job.pagesDir, `${name}.txt`);
		fs.writeFileSync(textPath, text, 'utf8');
		return { pageNumber, imagePath, textPath, text, isTextSparse: text.length < 20 };
	});
	return validatePagesManifest({ sourceType, pageCount: pages.length, pages });
}

function main() {
	const jobPath = process.argv[2];
	if (!jobPath) usage();
	const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
	for (const field of ['sourcePath', 'presentationDir', 'pagesDir', 'pagesManifestPath']) {
		if (!job[field]) throw new Error(`Presentation extract job missing field: ${field}`);
	}
	const extension = extensionOf(job.sourcePath);
	if (!['.pdf', '.pptx'].includes(extension)) {
		throw new Error('Only PDF and PPTX files are supported.');
	}
	fs.mkdirSync(job.presentationDir, { recursive: true });
	fs.mkdirSync(job.pagesDir, { recursive: true });
	const sourceType = extension.slice(1);
	const manifest = process.env.PRESENTATION_EXTRACT_FIXTURE
		? writeFixturePages(job, process.env.PRESENTATION_EXTRACT_FIXTURE, sourceType)
		: extractPdf(job, extension === '.pptx' ? convertPptxToPdf(job) : job.sourcePath, sourceType);
	fs.writeFileSync(job.pagesManifestPath, JSON.stringify(manifest, null, 2), 'utf8');
	console.log(JSON.stringify({ ok: true, pagesManifestPath: job.pagesManifestPath, pageCount: manifest.pageCount }));
}

try {
	main();
} catch (error) {
	console.error(error.stack || error.message);
	process.exit(1);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
node --test tools/video-composer/extract-presentation.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/video-composer/extract-presentation.mjs tools/video-composer/extract-presentation.test.mjs
git commit -m "feat: add presentation extraction cli"
```

## Task 3: Page Script Generation CLI

**Files:**
- Create: `tools/video-composer/presentation-script-client.mjs`
- Create: `tools/video-composer/presentation-script-client.test.mjs`

- [ ] **Step 1: Write failing script-client tests**

Create `tools/video-composer/presentation-script-client.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const scriptPath = new URL('./presentation-script-client.mjs', import.meta.url).pathname;

test('presentation-script-client writes normalized page-script from fixture response', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'presentation-script-'));
	const pagesManifestPath = path.join(root, 'pages.json');
	const pageScriptPath = path.join(root, 'page-script.json');
	const llmPromptPath = path.join(root, 'prompt.txt');
	const llmResponsePath = path.join(root, 'response.json');
	fs.writeFileSync(pagesManifestPath, JSON.stringify({
		sourceType: 'pdf',
		pageCount: 2,
		pages: [
			{ pageNumber: 1, imagePath: '/tmp/page-001.png', textPath: '/tmp/page-001.txt', text: '增长标题', isTextSparse: false },
			{ pageNumber: 2, imagePath: '/tmp/page-002.png', textPath: '/tmp/page-002.txt', text: '方法论', isTextSparse: false },
		],
	}));
	const fixtureResponse = path.join(root, 'fixture-response.txt');
	fs.writeFileSync(fixtureResponse, JSON.stringify({
		title: '增长课',
		summary: '讲增长',
		audience: '创业者',
		pages: [
			{ pageNumber: 1, pageTitle: '增长', speakerPrompt: '今天我们要聊的话题是增长。', spokenSummary: '增长', targetSeconds: 30 },
			{ pageNumber: 2, pageTitle: '方法', speakerPrompt: '接下来这一页讲方法论。', spokenSummary: '方法', targetSeconds: 25 },
		],
	}));
	const jobPath = path.join(root, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'script-test',
		pagesManifestPath,
		pageScriptPath,
		llmPromptPath,
		llmResponsePath,
		extraContext: '讲给创业者',
		podcastStyle: 'podcast_interview',
	}));
	const result = spawnSync('node', [scriptPath, jobPath], {
		encoding: 'utf8',
		env: { ...process.env, PRESENTATION_SCRIPT_FIXTURE_RESPONSE: fixtureResponse },
	});
	assert.equal(result.status, 0, result.stderr);
	const script = JSON.parse(fs.readFileSync(pageScriptPath, 'utf8'));
	assert.equal(script.pages.length, 2);
	assert.match(script.pages[0].speakerPrompt, /今天我们要聊/);
	assert.equal(fs.existsSync(llmPromptPath), true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test tools/video-composer/presentation-script-client.test.mjs
```

Expected: FAIL with missing script.

- [ ] **Step 3: Implement page script client**

Create `tools/video-composer/presentation-script-client.mjs`:

```js
#!/usr/bin/env node
import fs from 'node:fs';

import { normalizePageScript, validatePagesManifest } from './presentation-utils.mjs';

function buildPrompt({ pagesManifest, extraContext = '', podcastStyle = 'podcast_interview' }) {
	const pageBriefs = pagesManifest.pages.map((page) => [
		`页码：${page.pageNumber}`,
		`文本：${page.text || '这一页文字较少，请结合上下文用口语解释页面重点。'}`,
	].join('\n')).join('\n\n');
	return [
		'你是一个中文播客节目策划和演讲稿作者。',
		'请把下面 PDF/PPTX 的逐页内容改写成逐页播客式讲解脚本。',
		'返回严格 JSON，不要 Markdown，不要解释。',
		'JSON 字段必须是 title, summary, audience, pages。',
		'pages 中每一项必须包含 pageNumber, pageTitle, speakerPrompt, spokenSummary, targetSeconds。',
		'第一页 speakerPrompt 必须有自然播客开场，例如“今天我们要聊的话题是...”。',
		'后续页面要自然承接上一页。',
		'风格：' + podcastStyle,
		'补充观点/受众：' + (extraContext || '无'),
		'逐页内容：',
		pageBriefs,
	].join('\n');
}

async function callLlm(prompt) {
	const url = process.env.DOUBAO_LLM_URL || process.env.OPENAI_BASE_URL;
	const apiKey = process.env.DOUBAO_LLM_API_KEY || process.env.OPENAI_API_KEY;
	const model = process.env.DOUBAO_LLM_MODEL || process.env.OPENAI_MODEL || 'doubao-seed-1-6';
	if (!url || !apiKey) throw new Error('Missing LLM config: set DOUBAO_LLM_URL and DOUBAO_LLM_API_KEY.');
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
		body: JSON.stringify({
			model,
			messages: [{ role: 'user', content: prompt }],
			temperature: 0.5,
		}),
	});
	if (!response.ok) throw new Error(`LLM request failed: ${response.status} ${await response.text()}`);
	const payload = await response.json();
	return payload.choices?.[0]?.message?.content || payload.output_text || JSON.stringify(payload);
}

async function main() {
	const jobPath = process.argv[2];
	if (!jobPath) throw new Error('Usage: node tools/video-composer/presentation-script-client.mjs JOB_JSON_PATH');
	const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
	const pagesManifest = validatePagesManifest(JSON.parse(fs.readFileSync(job.pagesManifestPath, 'utf8')));
	const prompt = buildPrompt({
		pagesManifest,
		extraContext: job.extraContext,
		podcastStyle: job.podcastStyle,
	});
	fs.writeFileSync(job.llmPromptPath, prompt, 'utf8');
	const rawResponse = process.env.PRESENTATION_SCRIPT_FIXTURE_RESPONSE
		? fs.readFileSync(process.env.PRESENTATION_SCRIPT_FIXTURE_RESPONSE, 'utf8')
		: await callLlm(prompt);
	fs.writeFileSync(job.llmResponsePath, rawResponse, 'utf8');
	const script = normalizePageScript(rawResponse, pagesManifest.pageCount);
	fs.writeFileSync(job.pageScriptPath, JSON.stringify(script, null, 2), 'utf8');
	console.log(JSON.stringify({ ok: true, pageScriptPath: job.pageScriptPath, pageCount: script.pages.length }));
}

main().catch((error) => {
	console.error(error.stack || error.message);
	process.exit(1);
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
node --test tools/video-composer/presentation-script-client.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/video-composer/presentation-script-client.mjs tools/video-composer/presentation-script-client.test.mjs
git commit -m "feat: add presentation script client"
```

## Task 4: Per-Page AI Podcast Wrapper

**Files:**
- Create: `tools/video-composer/presentation-podcast-client.mjs`
- Create: `tools/video-composer/presentation-podcast-client.test.mjs`

- [ ] **Step 1: Write failing wrapper tests**

Create `tools/video-composer/presentation-podcast-client.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const scriptPath = new URL('./presentation-podcast-client.mjs', import.meta.url).pathname;

test('presentation-podcast-client builds page audio manifest from fixture page outputs', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'presentation-podcast-'));
	const audioDir = path.join(root, 'audio');
	const timingDir = path.join(root, 'timing');
	const transcriptDir = path.join(root, 'transcript');
	fs.mkdirSync(audioDir);
	fs.mkdirSync(timingDir);
	fs.mkdirSync(transcriptDir);
	const pageScriptPath = path.join(root, 'page-script.json');
	fs.writeFileSync(pageScriptPath, JSON.stringify({
		title: '测试',
		pages: [
			{ pageNumber: 1, speakerPrompt: '今天我们要聊的话题是第一页。' },
			{ pageNumber: 2, speakerPrompt: '接下来这一页讲第二页。' },
		],
	}));
	const fixtureDir = path.join(root, 'fixtures');
	fs.mkdirSync(fixtureDir);
	for (const page of [1, 2]) {
		fs.writeFileSync(path.join(fixtureDir, `page-${String(page).padStart(3, '0')}.mp3`), `audio-${page}`);
		fs.writeFileSync(path.join(fixtureDir, `page-${String(page).padStart(3, '0')}.json`), JSON.stringify({
			duration: page * 10,
			subtitles: [{ text: `第${page}页`, start: 0, end: 1 }],
			source: 'podcast_estimated',
		}));
		fs.writeFileSync(path.join(fixtureDir, `page-${String(page).padStart(3, '0')}.txt`), `第${page}页 transcript`);
	}
	const jobPath = path.join(root, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'podcast-test',
		pageScriptPath,
		audioDir,
		timingDir,
		transcriptDir,
		pageAudioManifestPath: path.join(root, 'page-audio.json'),
		podcastSpeakerA: 'speaker-a',
		podcastSpeakerB: 'speaker-b',
	}));
	const result = spawnSync('node', [scriptPath, jobPath], {
		encoding: 'utf8',
		env: { ...process.env, PRESENTATION_PODCAST_FIXTURE_DIR: fixtureDir },
	});
	assert.equal(result.status, 0, result.stderr);
	const manifest = JSON.parse(fs.readFileSync(path.join(root, 'page-audio.json'), 'utf8'));
	assert.equal(manifest.pages.length, 2);
	assert.equal(manifest.pages[1].duration, 20);
	assert.equal(manifest.pages[0].transcript, '第1页 transcript');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test tools/video-composer/presentation-podcast-client.test.mjs
```

Expected: FAIL with missing script.

- [ ] **Step 3: Implement per-page podcast wrapper**

Create `tools/video-composer/presentation-podcast-client.mjs`:

```js
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { cleanSpokenTranscript, safePageName } from './presentation-utils.mjs';

function ffprobeDuration(audioPath) {
	const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', audioPath], { encoding: 'utf8' });
	const duration = Number(result.stdout.trim());
	return Number.isFinite(duration) ? duration : 0;
}

function readTiming(timingPath, fallbackDuration) {
	const timing = JSON.parse(fs.readFileSync(timingPath, 'utf8'));
	return {
		duration: Number(timing.duration) || fallbackDuration,
		subtitleEvents: Array.isArray(timing.subtitles) ? timing.subtitles : [],
		source: timing.source || 'unknown',
	};
}

function copyFixturePage({ fixtureDir, name, audioPath, timingPath, transcriptPath }) {
	fs.copyFileSync(path.join(fixtureDir, `${name}.mp3`), audioPath);
	fs.copyFileSync(path.join(fixtureDir, `${name}.json`), timingPath);
	fs.copyFileSync(path.join(fixtureDir, `${name}.txt`), transcriptPath);
}

function runAiPodcastPage(job, page, paths) {
	const pageJobPath = path.join(job.audioDir, `${paths.name}-ai-podcast-job.json`);
	fs.writeFileSync(pageJobPath, JSON.stringify({
		jobId: `${job.jobId}-${paths.name}`,
		podcastInputText: page.speakerPrompt,
		podcastSpeakerA: job.podcastSpeakerA,
		podcastSpeakerB: job.podcastSpeakerB,
		useHeadMusic: false,
		ttsDir: job.audioDir,
		audioPath: paths.audioPath,
		ttsTimingPath: paths.timingPath,
		transcriptPath: paths.transcriptPath,
		costPath: paths.costPath,
		podcastMetadataPath: paths.metadataPath,
		podcastRawResponsePath: paths.rawResponsePath,
	}, null, 2), 'utf8');
	const result = spawnSync('node', [new URL('./ai-podcast-client.mjs', import.meta.url).pathname, pageJobPath], {
		encoding: 'utf8',
		maxBuffer: 1024 * 1024 * 20,
	});
	if (result.status !== 0) {
		throw new Error(`AI podcast failed on page ${page.pageNumber}: ${result.stderr || result.stdout}`);
	}
}

function main() {
	const jobPath = process.argv[2];
	if (!jobPath) throw new Error('Usage: node tools/video-composer/presentation-podcast-client.mjs JOB_JSON_PATH');
	const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
	for (const dir of [job.audioDir, job.timingDir, job.transcriptDir]) fs.mkdirSync(dir, { recursive: true });
	const script = JSON.parse(fs.readFileSync(job.pageScriptPath, 'utf8'));
	const pages = script.pages.map((page) => {
		const name = safePageName(page.pageNumber);
		const paths = {
			name,
			audioPath: path.join(job.audioDir, `${name}.mp3`),
			timingPath: path.join(job.timingDir, `${name}.json`),
			transcriptPath: path.join(job.transcriptDir, `${name}.txt`),
			costPath: path.join(job.audioDir, `${name}-cost.json`),
			metadataPath: path.join(job.audioDir, `${name}-metadata.json`),
			rawResponsePath: path.join(job.audioDir, `${name}-response.binlog`),
		};
		if (process.env.PRESENTATION_PODCAST_FIXTURE_DIR) {
			copyFixturePage({ fixtureDir: process.env.PRESENTATION_PODCAST_FIXTURE_DIR, ...paths });
		} else {
			runAiPodcastPage(job, page, paths);
		}
		const transcript = cleanSpokenTranscript(fs.existsSync(paths.transcriptPath) ? fs.readFileSync(paths.transcriptPath, 'utf8') : '');
		if (!transcript) throw new Error(`AI podcast transcript is empty on page ${page.pageNumber}`);
		const duration = ffprobeDuration(paths.audioPath);
		const timing = readTiming(paths.timingPath, duration);
		return {
			pageNumber: page.pageNumber,
			audioPath: paths.audioPath,
			timingPath: paths.timingPath,
			transcriptPath: paths.transcriptPath,
			costPath: paths.costPath,
			duration: timing.duration,
			transcript,
			subtitleEvents: timing.subtitleEvents,
			subtitleSource: timing.source,
		};
	});
	fs.writeFileSync(job.pageAudioManifestPath, JSON.stringify({ pages }, null, 2), 'utf8');
	console.log(JSON.stringify({ ok: true, pageAudioManifestPath: job.pageAudioManifestPath, pageCount: pages.length }));
}

try {
	main();
} catch (error) {
	console.error(error.stack || error.message);
	process.exit(1);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
node --test tools/video-composer/presentation-podcast-client.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/video-composer/presentation-podcast-client.mjs tools/video-composer/presentation-podcast-client.test.mjs
git commit -m "feat: add per-page podcast client"
```

## Task 5: Full-Screen Presentation Composer

**Files:**
- Create: `tools/video-composer/compose-presentation-video.mjs`
- Create: `tools/video-composer/compose-presentation-video.test.mjs`

- [ ] **Step 1: Write failing composer tests**

Create `tools/video-composer/compose-presentation-video.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildSegmentFfmpegArgs,
	createAssSubtitle,
	scalePageFilter,
} from './compose-presentation-video.mjs';

test('scalePageFilter preserves full page without cropping', () => {
	assert.equal(
		scalePageFilter('[0:v]', 1920, 1080, '[pagev]'),
		'[0:v]scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=white[pagev]',
	);
});

test('createAssSubtitle writes white transparent subtitle events', () => {
	const ass = createAssSubtitle({
		width: 1920,
		height: 1080,
		events: [{ text: '今天我们要聊的话题是增长。', start: 0, end: 2 }],
	});
	assert.match(ass, /Style: Default,Arial,64,&H00FFFFFF/);
	assert.match(ass, /Dialogue: 0,0:00:00.00,0:00:02.00,Default/);
	assert.doesNotMatch(ass, /BackColour.*&H/);
});

test('buildSegmentFfmpegArgs maps page image and audio into one segment', () => {
	const args = buildSegmentFfmpegArgs({
		pageImage: '/tmp/page-001.png',
		audioPath: '/tmp/page-001.mp3',
		subtitlePath: '/tmp/page-001.ass',
		outputPath: '/tmp/segment-001.mp4',
		width: 1920,
		height: 1080,
		fps: 30,
	});
	assert.deepEqual(args.slice(0, 5), ['-y', '-loop', '1', '-i', '/tmp/page-001.png']);
	assert.equal(args.includes('/tmp/page-001.mp3'), true);
	assert.equal(args.includes('/tmp/segment-001.mp4'), true);
	assert.equal(args.includes('-shortest'), true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test tools/video-composer/compose-presentation-video.test.mjs
```

Expected: FAIL with missing composer.

- [ ] **Step 3: Implement presentation composer**

Create `tools/video-composer/compose-presentation-video.mjs`:

```js
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { buildPageTiming, safePageName, validatePagesManifest } from './presentation-utils.mjs';
import { assEscape, toAssTime } from './compose-video.mjs';

export function scalePageFilter(input, width, height, label) {
	return `${input}scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=white${label}`;
}

export function createAssSubtitle({ width = 1920, height = 1080, events = [] }) {
	const lines = [
		'[Script Info]',
		'ScriptType: v4.00+',
		`PlayResX: ${width}`,
		`PlayResY: ${height}`,
		'',
		'[V4+ Styles]',
		'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding',
		'Style: Default,Arial,64,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,3,1,2,80,80,90,1',
		'',
		'[Events]',
		'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text',
	];
	for (const event of events) {
		lines.push(`Dialogue: 0,${toAssTime(event.start)},${toAssTime(event.end)},Default,,0,0,0,,${assEscape(event.text)}`);
	}
	return `${lines.join('\n')}\n`;
}

function escapeForFilterPath(filePath) {
	return String(filePath).replace(/\\/g, '/').replace(/([\\':,;\[\] ])/g, '\\$1');
}

export function buildSegmentFfmpegArgs({ pageImage, audioPath, subtitlePath, outputPath, width = 1920, height = 1080, fps = 30 }) {
	const filter = `${scalePageFilter('[0:v]', width, height, '[pagev]')};[pagev]subtitles=filename=${escapeForFilterPath(subtitlePath)}[vout]`;
	return [
		'-y',
		'-loop', '1',
		'-i', pageImage,
		'-i', audioPath,
		'-filter_complex', filter,
		'-map', '[vout]',
		'-map', '1:a',
		'-r', String(fps),
		'-c:v', 'libx264',
		'-pix_fmt', 'yuv420p',
		'-c:a', 'aac',
		'-shortest',
		outputPath,
	];
}

function runFfmpeg(args, logPath) {
	const result = spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });
	fs.appendFileSync(logPath, `$ ffmpeg ${args.join(' ')}\n${result.stdout}\n${result.stderr}\n`, 'utf8');
	if (result.status !== 0) throw new Error(`ffmpeg failed with exit code ${result.status}; see ${logPath}`);
}

function render() {
	const jobPath = process.argv[2];
	if (!jobPath) throw new Error('Usage: node tools/video-composer/compose-presentation-video.mjs JOB_JSON_PATH');
	const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
	fs.mkdirSync(job.renderDir, { recursive: true });
	const pagesManifest = validatePagesManifest(JSON.parse(fs.readFileSync(job.pagesManifestPath, 'utf8')));
	const audioManifest = JSON.parse(fs.readFileSync(job.pageAudioManifestPath, 'utf8'));
	const timing = buildPageTiming({
		pages: pagesManifest.pages,
		audio: audioManifest.pages,
		pagePauseSeconds: job.pagePauseSeconds ?? 0.3,
	});
	fs.writeFileSync(job.pageTimingPath, JSON.stringify(timing, null, 2), 'utf8');
	fs.writeFileSync(job.subtitlePath, createAssSubtitle({ width: job.width ?? 1920, height: job.height ?? 1080, events: timing.subtitles }), 'utf8');
	const concatListPath = path.join(job.renderDir, 'segments.txt');
	const concatLines = [];
	for (const page of timing.pages) {
		const name = safePageName(page.pageNumber);
		const pageSubtitlePath = path.join(job.renderDir, `${name}.ass`);
		fs.writeFileSync(pageSubtitlePath, createAssSubtitle({
			width: job.width ?? 1920,
			height: job.height ?? 1080,
			events: page.subtitleEvents.map((event) => ({ ...event, start: event.start - page.start, end: event.end - page.start })),
		}), 'utf8');
		const segmentPath = path.join(job.renderDir, `segment-${String(page.pageNumber).padStart(3, '0')}.mp4`);
		runFfmpeg(buildSegmentFfmpegArgs({
			pageImage: page.pageImage,
			audioPath: page.audioPath,
			subtitlePath: pageSubtitlePath,
			outputPath: segmentPath,
			width: job.width ?? 1920,
			height: job.height ?? 1080,
			fps: job.fps ?? 30,
		}), job.ffmpegLogPath);
		concatLines.push(`file '${segmentPath.replace(/'/g, "'\\''")}'`);
	}
	fs.writeFileSync(concatListPath, concatLines.join('\n'), 'utf8');
	runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', job.outputVideoPath], job.ffmpegLogPath);
	console.log(JSON.stringify({ ok: true, outputVideoPath: job.outputVideoPath, pageTimingPath: job.pageTimingPath }));
}

if (process.argv[1] && process.argv[1].endsWith('compose-presentation-video.mjs')) {
	try {
		render();
	} catch (error) {
		console.error(error.stack || error.message);
		process.exit(1);
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
node --test tools/video-composer/compose-presentation-video.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/video-composer/compose-presentation-video.mjs tools/video-composer/compose-presentation-video.test.mjs
git commit -m "feat: add presentation video composer"
```

## Task 6: Importable n8n Workflow

**Files:**
- Create: `workflows/presentation-ai-podcast-workflow.json`

- [ ] **Step 1: Create workflow JSON**

Create `workflows/presentation-ai-podcast-workflow.json` by copying the node style from `workflows/video-clip-ai-podcast-workflow.json` and using this node chain:

```text
Form Trigger
  -> Prepare Job
  -> Convert Presentation
  -> Generate Page Podcast Script
  -> Run Page AI Podcast
  -> Build Presentation Job
  -> Run Presentation Composer
  -> Prepare Response
  -> Respond to Webhook
```

Required form fields:

```json
[
  { "fieldLabel": "presentation_file", "fieldType": "file", "requiredField": true },
  { "fieldLabel": "extra_context", "fieldType": "textarea", "requiredField": false },
  { "fieldLabel": "podcast_speaker_a", "fieldType": "dropdown", "requiredField": false },
  { "fieldLabel": "podcast_speaker_b", "fieldType": "dropdown", "requiredField": false },
  { "fieldLabel": "podcast_style", "fieldType": "dropdown", "requiredField": false }
]
```

Use Chinese labels for voice dropdown options and keep the value after `｜`, matching the existing workflow pattern:

```text
男主持 - 温柔阿虎｜zh_male_wennuanahu_uranus_bigtts
男主持 - 刘飞｜zh_male_liufei_uranus_bigtts
男主持 - 渊博小叔｜zh_male_yuanboxiaoshu_uranus_bigtts
女嘉宾 - Tina 老师｜zh_female_yingyujiaoxue_uranus_bigtts
```

The `Prepare Job` Code node writes these JSON fields:

```js
{
	jobId,
	baseDir: repoDir + '/tmp/n8n-video-jobs',
	jobDir,
	presentationDir,
	pagesDir,
	scriptDir,
	audioDir,
	timingDir,
	transcriptDir,
	renderDir,
	repoDir,
	sourcePath,
	pagesManifestPath,
	pageScriptPath,
	pageAudioManifestPath,
	pageTimingPath,
	subtitlePath,
	outputVideoPath,
	ffmpegLogPath,
	extraContext,
	podcastSpeakerA,
	podcastSpeakerB,
	podcastStyle
}
```

Each runner Code node uses `spawnSync('node', [scriptPath, jobPath], { cwd: item.repoDir, encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 })` and throws with stdout/stderr if non-zero.

- [ ] **Step 2: Validate workflow JSON parses**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('workflows/presentation-ai-podcast-workflow.json','utf8')); console.log('workflow ok')"
```

Expected: `workflow ok`.

- [ ] **Step 3: Validate Code node JavaScript parses**

Run:

```bash
node - <<'NODE'
const fs = require('fs');
const workflow = JSON.parse(fs.readFileSync('workflows/presentation-ai-podcast-workflow.json', 'utf8'));
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
for (const node of workflow.nodes) {
  const code = node.parameters?.jsCode;
  if (code) new AsyncFunction(code);
}
console.log('code nodes ok');
NODE
```

Expected: `code nodes ok`.

- [ ] **Step 4: Commit**

```bash
git add workflows/presentation-ai-podcast-workflow.json
git commit -m "feat: add presentation ai podcast workflow"
```

## Task 7: Docs And Env Template

**Files:**
- Modify: `.env.video-clip.example`
- Modify: `docs/video-clip-tts-workflow.md`

- [ ] **Step 1: Update `.env.video-clip.example`**

Add this section:

```bash
# Presentation AI Podcast workflow.
# PPTX input requires LibreOffice (`soffice`) in PATH.
# PDF page rendering requires Poppler tools (`pdftoppm`, `pdftotext`) in PATH.
PRESENTATION_PAGE_PAUSE_SECONDS=0.3
PRESENTATION_VIDEO_WIDTH=1920
PRESENTATION_VIDEO_HEIGHT=1080
PRESENTATION_VIDEO_FPS=30
```

- [ ] **Step 2: Update docs**

Add this section to `docs/video-clip-tts-workflow.md`:

```markdown
## Presentation AI Podcast Workflow

The presentation version is `workflows/presentation-ai-podcast-workflow.json`.
It accepts one `PDF` or `PPTX` file plus optional audience/context text, extracts each page, generates page-bound podcast prompts, calls AI Podcast once per page, and renders a full-screen page explanation video.

Review artifacts are written to `tmp/n8n-video-jobs/{jobId}`. The most useful files are `pages.json`, `script/page-script.json`, `audio/page-*.mp3`, `timing/page-timing.json`, `render/segment-*.mp4`, `render/final.mp4`, and `cost.json`.

For PPTX input, install LibreOffice. For PDF page rendering and text extraction, install Poppler tools.
```

- [ ] **Step 3: Run docs diff check**

Run:

```bash
git diff --check -- .env.video-clip.example docs/video-clip-tts-workflow.md
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add .env.video-clip.example docs/video-clip-tts-workflow.md
git commit -m "docs: document presentation podcast workflow"
```

## Task 8: End-To-End Static Verification

**Files:**
- Modify only if verification finds a defect in earlier task files.

- [ ] **Step 1: Run all focused unit tests**

Run:

```bash
node --test \
  tools/video-composer/presentation-utils.test.mjs \
  tools/video-composer/extract-presentation.test.mjs \
  tools/video-composer/presentation-script-client.test.mjs \
  tools/video-composer/presentation-podcast-client.test.mjs \
  tools/video-composer/compose-presentation-video.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run existing related tests**

Run:

```bash
node --test \
  tools/video-composer/ai-podcast-utils.test.mjs \
  tools/video-composer/ai-podcast-client.test.mjs \
  tools/video-composer/compose-video.test.mjs
```

Expected: PASS.

- [ ] **Step 3: Parse all workflow JSON files**

Run:

```bash
node - <<'NODE'
const fs = require('fs');
for (const file of [
  'workflows/video-clip-tts-workflow.json',
  'workflows/video-clip-ai-podcast-workflow.json',
  'workflows/presentation-ai-podcast-workflow.json',
]) {
  JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`${file} ok`);
}
NODE
```

Expected: all three files print `ok`.

- [ ] **Step 4: Run whitespace check**

Run:

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 5: Commit verification fixes if needed**

If any command required fixes, commit the fixes:

```bash
git add tools/video-composer workflows docs .env.video-clip.example
git commit -m "fix: stabilize presentation podcast workflow"
```

If no fixes were needed, do not create an empty commit.

## Task 9: Runtime Smoke Validation

**Files:**
- Modify only if runtime validation finds a defect in earlier task files.

- [ ] **Step 1: Check local dependencies**

Run:

```bash
command -v ffmpeg
command -v ffprobe
command -v pdftoppm
command -v pdftotext
command -v soffice || true
```

Expected:

- `ffmpeg`, `ffprobe`, `pdftoppm`, and `pdftotext` print paths.
- `soffice` prints a path if PPTX smoke validation will be run locally.

- [ ] **Step 2: Import the workflow**

Run:

```bash
VIDEO_CLIP_ENV_FILE=/Users/stephenqiu/Desktop/Repository/n8n/.env.video-clip \
./packages/cli/bin/n8n import:workflow \
  --input=/Users/stephenqiu/Desktop/Repository/n8n/workflows/presentation-ai-podcast-workflow.json
```

Expected: n8n reports the workflow was imported.

- [ ] **Step 3: Run PDF smoke test through form endpoint**

Use a 2-page PDF sample and run:

```bash
curl -sS -X POST http://localhost:5678/form/presentation-ai-podcast-upload \
  -F "presentation_file=@/absolute/path/to/sample.pdf" \
  -F "extra_context=面向普通听众，用播客访谈方式解释，每页讲清楚一个重点" \
  -F "podcast_speaker_a=男主持 - 温柔阿虎｜zh_male_wennuanahu_uranus_bigtts" \
  -F "podcast_speaker_b=女嘉宾 - Tina 老师｜zh_female_yingyujiaoxue_uranus_bigtts" \
  -F "podcast_style=podcast_interview" \
  -o /tmp/presentation-ai-podcast-response.json
```

Expected:

- response JSON has `ok: true`
- response JSON has `reviewDir`
- `reviewDir/render/final.mp4` exists and is non-empty
- `reviewDir/audio/merged-audio.mp3` exists and is non-empty
- `reviewDir/timing/page-timing.json` exists
- `reviewDir/render/subtitles.ass` exists

- [ ] **Step 4: Inspect timing and segment files**

Run:

```bash
REVIEW_DIR="$(jq -r '.reviewDir' /tmp/presentation-ai-podcast-response.json)"
jq '{pageCount: (.pages | length), totalDuration, firstPage: .pages[0]}' "$REVIEW_DIR/timing/page-timing.json"
ls -lh "$REVIEW_DIR/render/final.mp4" "$REVIEW_DIR/audio/merged-audio.mp3" "$REVIEW_DIR/render"/segment-*.mp4
```

Expected:

- `pageCount` equals the source PDF page count.
- segment files exist for every page.
- first page starts at `0`.
- second page starts after first page duration plus pause.

- [ ] **Step 5: Commit runtime fixes if needed**

If runtime smoke validation required fixes:

```bash
git add tools/video-composer workflows docs .env.video-clip.example
git commit -m "fix: complete presentation podcast runtime flow"
```

If no fixes were needed, do not create an empty commit.

## Self-Review

- Spec coverage: The plan covers PDF/PPTX input, page image/text extraction, page-bound podcast script JSON, per-page AI Podcast audio, transcript/timing cleanup, merged timing, white transparent subtitles, full-screen page rendering, cost aggregation, n8n workflow import, and runtime smoke validation.
- Placeholder scan: The plan has no unfinished markers or unspecified "add tests" steps. Every task lists concrete files, commands, expected results, and implementation snippets.
- Type consistency: The plan consistently uses `pagesManifestPath`, `pageScriptPath`, `pageAudioManifestPath`, `pageTimingPath`, `presentation_file`, `extra_context`, `podcast_speaker_a`, `podcast_speaker_b`, `podcast_style`, `pageNumber`, `speakerPrompt`, `subtitleEvents`, `audioPath`, and `duration` across tasks.
