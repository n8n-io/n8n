#!/usr/bin/env node
// Take a cropped canvas screenshot of each workflow that a run created.
//
//   node capture_canvas.mjs <run-dir>
//
// Reads <run-dir>/<builder>/run.json and writes <run-dir>/<builder>/canvas.png and workflow.json.
// Uses the Playwright copy in the repo test package. Falls back to the local Chrome install.
import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../../..');
const require = createRequire(join(repo, 'packages/quality/testing/playwright/package.json'));
const { chromium } = require('@playwright/test');

const runDir = resolve(process.argv[2] ?? '.');
// Same order as n8n_api.config(): .env.local, then .env.ai-surfaces, then the environment.
const settings = {};
for (const file of [
	join(repo, '.env.local'),
	process.env.AI_SURFACES_ENV ?? join(repo, '.env.ai-surfaces'),
]) {
	if (!existsSync(file)) continue;
	for (const line of readFileSync(file, 'utf8').split('\n')) {
		const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
		if (!match) continue;
		const value = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
		if (value) settings[match[1]] = value;
	}
}
const setting = (name, fallback) => process.env[name] || settings[name] || fallback;

const baseUrl = setting('N8N_BASE_URL', 'http://localhost:5678').replace(/\/$/, '');
const email = setting('N8N_EVAL_EMAIL', 'nathan@n8n.io');
const password = setting('N8N_EVAL_PASSWORD', 'PlaywrightTest123');

const runs = readdirSync(runDir, { withFileTypes: true })
	.filter((d) => d.isDirectory() && existsSync(join(runDir, d.name, 'run.json')))
	.map((d) => ({
		dir: join(runDir, d.name),
		meta: JSON.parse(readFileSync(join(runDir, d.name, 'run.json'), 'utf8')),
	}))
	.filter((r) => r.meta.workflowId);

if (runs.length === 0) {
	console.log('No run has a workflowId. Nothing to capture.');
	process.exit(0);
}

const launch = existsSync(chromium.executablePath()) ? {} : { channel: 'chrome' };
const browser = await chromium.launch({ headless: true, ...launch });
const VIEWPORT = { width: 1800, height: 1000 };
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
const page = await context.newPage();

await page.goto(`${baseUrl}/signin`);
await page.getByRole('textbox', { name: 'Email' }).fill(email);
await page.getByRole('textbox', { name: 'Password' }).fill(password);
await page.getByRole('button', { name: 'Sign in', exact: true }).click();
await page.waitForURL((url) => !url.pathname.startsWith('/signin'), { timeout: 30_000 });

for (const { dir, meta } of runs) {
	const id = meta.workflowId;
	const res = await page.request.get(`${baseUrl}/rest/workflows/${id}`, {
		headers: {
			'browser-id': await page.evaluate(() => localStorage.getItem('n8n-browserId') ?? ''),
		},
	});
	if (res.ok())
		writeFileSync(join(dir, 'workflow.json'), JSON.stringify((await res.json()).data, null, 1));
	else console.log(`${id}: workflow fetch failed with ${res.status()}`);

	await page.goto(`${baseUrl}/workflow/${id}`);
	try {
		await page.locator('[data-test-id="canvas-node"]').first().waitFor({ timeout: 30_000 });
	} catch {
		console.log(`${id}: no canvas nodes, skipped`);
		continue;
	}
	// Expanding one group re-renders the others, so repeat until no collapsed group is left.
	for (let round = 0; round < 5; round++) {
		const clicked = await page.evaluate(() => {
			const buttons = [...document.querySelectorAll('button[aria-label="Expand"]')];
			buttons.forEach((b) => b.click());
			return buttons.length;
		});
		if (clicked === 0) break;
		await page.waitForTimeout(400);
	}
	// The layout moves after groups expand. Fit twice so the second fit sees the final size.
	for (let i = 0; i < 2; i++) {
		await page.waitForTimeout(1000);
		await page
			.locator('[data-test-id="zoom-to-fit"]')
			.click({ timeout: 5_000 })
			.catch(() => {});
	}
	await page.waitForTimeout(800);

	const box = await page.evaluate(() => {
		const rects = [...document.querySelectorAll('.vue-flow__node')].map((n) =>
			n.getBoundingClientRect(),
		);
		if (rects.length === 0) return null;
		// Expanded groups overflow their node element downward, so the bottom edge uses descendants.
		const inner = [...document.querySelectorAll('.vue-flow__node *')]
			.map((n) => n.getBoundingClientRect())
			.filter((r) => r.width > 0 && r.height > 0);
		const left = Math.min(...rects.map((r) => r.left));
		const top = Math.min(...rects.map((r) => r.top));
		const right = Math.max(...rects.map((r) => r.right));
		const bottom = Math.max(...rects.concat(inner).map((r) => r.bottom));
		return { left, top, right, bottom };
	});
	const pad = 40;
	const clip = box
		? {
				x: Math.max(0, box.left - pad),
				y: Math.max(0, box.top - pad),
				width: Math.min(VIEWPORT.width, box.right + pad) - Math.max(0, box.left - pad),
				height: Math.min(VIEWPORT.height, box.bottom + pad) - Math.max(0, box.top - pad),
			}
		: undefined;
	await page.screenshot({ path: join(dir, 'canvas.png'), clip });
	console.log(`${id}: canvas.png written`);
}

await browser.close();
