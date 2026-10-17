#!/usr/bin/env node
// Record a video of an Instance AI thread in the n8n UI while the run continues.
//
//   node record_iai.mjs <out-dir>
//
// Protocol on stdin and stdout, one line each:
//   prints "ready" after sign-in
//   reads  "open <thread-url>" and opens the thread
//   reads  "stop", or stdin closes: keeps the last screen for a moment, then saves <out-dir>/screen.webm
//                                   and the last screen as <out-dir>/screen-poster.png
// The sign-in happens in a separate context, so the video starts at the thread.
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';

import { launchBrowser, signIn } from './n8n_browser.mjs';

const outDir = resolve(process.argv[2] ?? '.');
const SIZE = { width: 1600, height: 1000 };

const browser = await launchBrowser();
const login = await browser.newContext();
const loginPage = await login.newPage();
await signIn(loginPage);
const storageState = await login.storageState();
await login.close();

const videoDir = mkdtempSync(join(tmpdir(), 'cwb-video-'));
const context = await browser.newContext({
	viewport: SIZE,
	storageState,
	recordVideo: { dir: videoDir, size: SIZE },
});
const page = await context.newPage();
console.log('ready');

const lines = createInterface({ input: process.stdin });
for await (const line of lines) {
	if (line.startsWith('open ')) {
		await page.goto(line.slice(5).trim(), { waitUntil: 'domcontentloaded' });
		console.log('opened');
	} else if (line.trim() === 'stop') {
		break;
	}
}

await page.waitForTimeout(3000);
// The video starts on a blank page, so the report shows the last screen until playback starts.
await page.screenshot({ path: join(outDir, 'screen-poster.png') }).catch(() => {});
const video = page.video();
await context.close();
if (video) {
	copyFileSync(await video.path(), join(outDir, 'screen.webm'));
	console.log('saved screen.webm');
}
await browser.close();
rmSync(videoDir, { recursive: true, force: true });
