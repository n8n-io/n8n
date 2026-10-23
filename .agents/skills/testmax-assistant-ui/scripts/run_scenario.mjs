#!/usr/bin/env node
// Run one scenario script in a browser that is signed in to an n8n instance.
//
//   node run_scenario.mjs --out <dir> --script <file.mjs> [--live] [--auto-confirm]
//                         [--timeout-min 10] [--viewport 1600x1000]
//
// N8N_BASE_URL selects the instance. Writes to <dir>:
//   steps.json            the steps, checks and captures with their screenshots (updated while it runs)
//   step-NN.png ...       one screenshot for each step, check and capture
//   captures/<name>.png   screens for the visual check, with <name>.aria.yml
//   live.png              the screen every 2.5 seconds, for the live page (with --live)
//   screen.webm           the video, with screen-poster.png
//   console.json          browser errors and failed requests to the instance
//   result.json           {status: passed|failed|error, error, threads, prompts, startedAt, finishedAt, ...}
// Prints "thread <id>" for each thread that the scenario opens, so run.py can read its events.
import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import {
	baseUrl,
	launchBrowser,
	selectors,
	setting,
	signIn,
} from '../../testmax-n8n-ai/scripts/n8n_browser.mjs';
import { StepFailed, createKit } from './kit.mjs';

const { values: args } = parseArgs({
	options: {
		out: { type: 'string' },
		script: { type: 'string' },
		live: { type: 'boolean', default: false },
		'auto-confirm': { type: 'boolean', default: false },
		'timeout-min': { type: 'string', default: '10' },
		viewport: { type: 'string', default: '1600x1000' },
	},
});
const out = resolve(args.out);
mkdirSync(out, { recursive: true });
const [width, height] = args.viewport.split('x').map(Number);
const size = { width, height };
const LIVE_SHOT_MS = 2500;
const emit = (line) => console.log(line.replace(/\s+/g, ' ').slice(0, 300));

/**
 * Sign in through the REST API, which is about 1.3 seconds faster than the sign-in page. The auth cookie
 * is bound to the browser-id header of the login, so the page gets the same id in localStorage.
 * Falls back to the sign-in page.
 */
async function signedInState(browser) {
	const login = await browser.newContext();
	try {
		const browserId = randomUUID();
		const res = await login.request.post(`${baseUrl}/rest/login`, {
			headers: { 'browser-id': browserId },
			data: {
				emailOrLdapLoginId: setting('N8N_EVAL_EMAIL', 'nathan@n8n.io'),
				password: setting('N8N_EVAL_PASSWORD', 'PlaywrightTest123'),
			},
		});
		if (res.ok()) {
			const state = await login.storageState();
			state.origins = [
				{
					origin: new URL(baseUrl).origin,
					localStorage: [{ name: 'n8n-browserId', value: browserId }],
				},
			];
			return state;
		}
		await signIn(await login.newPage());
		return await login.storageState();
	} finally {
		await login.close();
	}
}

selectors.setTestIdAttribute('data-test-id');
const browser = await launchBrowser();
const storageState = await signedInState(browser);

// The video starts after the sign-in, at the first page of the scenario.
const videoDir = mkdtempSync(join(tmpdir(), 'feature-test-video-'));
const context = await browser.newContext({
	viewport: size,
	storageState,
	recordVideo: { dir: videoDir, size },
});
const page = await context.newPage();

const origin = new URL(baseUrl).origin;
const consoleErrors = [];
const requestErrors = [];
page.on('console', (m) => {
	if (m.type() === 'error')
		consoleErrors.push({ text: m.text().slice(0, 1000), url: m.location()?.url });
});
page.on('pageerror', (e) => consoleErrors.push({ text: `Uncaught: ${e.message}`.slice(0, 1000) }));
page.on('response', (r) => {
	if (r.status() >= 400 && r.url().startsWith(origin)) {
		requestErrors.push({
			status: r.status(),
			method: r.request().method(),
			url: r.url().slice(origin.length),
		});
	}
});
page.on('requestfailed', (r) => {
	const failure = r.failure()?.errorText ?? '';
	// Closed event streams and aborted navigations are normal.
	if (r.url().startsWith(origin) && !/ERR_ABORTED|NS_BINDING_ABORTED/.test(failure)) {
		requestErrors.push({
			status: 0,
			method: r.method(),
			url: r.url().slice(origin.length),
			error: failure,
		});
	}
});

let shooting = false;
async function liveShot() {
	if (shooting) return;
	shooting = true;
	const partial = join(out, 'live.tmp.png');
	try {
		await page.screenshot({ path: partial });
		renameSync(partial, join(out, 'live.png'));
	} catch {
		// The page can be in the middle of a navigation. The next interval tries again.
	} finally {
		shooting = false;
	}
}
const liveTimer = args.live ? setInterval(liveShot, LIVE_SHOT_MS) : null;

const { t, threads, prompts, steps, stop } = createKit({
	page,
	out,
	baseUrl,
	autoConfirm: args['auto-confirm'],
	emit,
});
const result = { status: 'passed', startedAt: new Date().toISOString(), baseUrl };
const timeoutMs = Number(args['timeout-min']) * 60_000;
let timer;
try {
	const scenario = (await import(pathToFileURL(resolve(args.script)).href)).default;
	if (typeof scenario !== 'function')
		throw new Error('The script must export a default async function (t).');
	await Promise.race([
		scenario(t),
		new Promise((_, reject) => {
			timer = setTimeout(() => {
				// The race does not end the scenario function. stop() makes its next step throw.
				stop();
				reject(new Error(`The scenario did not finish in ${args['timeout-min']} minutes.`));
			}, timeoutMs);
		}),
	]);
	if (steps.some((s) => s.status === 'failed')) result.status = 'failed';
} catch (error) {
	result.status = error instanceof StepFailed || steps.length ? 'failed' : 'error';
	result.error = String(error?.message ?? error)
		.replace(/\u001b\[[0-9;]*m/g, '')
		.slice(0, 2000);
	if (!(error instanceof StepFailed)) emit(`error: ${result.error.split('\n')[0]}`);
} finally {
	clearTimeout(timer);
}

stop();
clearInterval(liveTimer);
for (const s of steps.filter((x) => x.status === 'running')) {
	s.status = 'failed';
	s.error = 'The scenario stopped during this step.';
}
writeFileSync(join(out, 'steps.json'), JSON.stringify(steps, null, 1));
await page.waitForTimeout(1500);
if (args.live) await liveShot();
await page.screenshot({ path: join(out, 'screen-poster.png') }).catch(() => {});
const video = page.video();
await context.close();
if (video) copyFileSync(await video.path(), join(out, 'screen.webm'));
await browser.close();
rmSync(videoDir, { recursive: true, force: true });

Object.assign(result, {
	finishedAt: new Date().toISOString(),
	threads,
	prompts,
	consoleErrors: consoleErrors.length,
	requestErrors: requestErrors.length,
});
writeFileSync(join(out, 'console.json'), JSON.stringify({ consoleErrors, requestErrors }, null, 1));
writeFileSync(join(out, 'result.json'), JSON.stringify(result, null, 2));
emit(`result ${result.status}`);
// A scenario that timed out can still wait on its own timers. The results are written, so end here.
process.exit(0);
