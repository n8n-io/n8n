#!/usr/bin/env node
// Take a cropped canvas screenshot of each workflow that a run created.
//
//   node capture_canvas.mjs <run-dir>
//
// Reads <run-dir>/<builder>/run.json and writes <run-dir>/<builder>/canvas.png and workflow.json.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { baseUrl, launchBrowser, signIn } from './n8n_browser.mjs';

const runDir = resolve(process.argv[2] ?? '.');

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

const browser = await launchBrowser();
const VIEWPORT = { width: 1800, height: 1000 };
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
const page = await context.newPage();
await signIn(page);

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
		// Labels, subtitles and expanded groups overflow their node element, so use the descendants too.
		// Only count what draws: hit areas and hover toolbars are empty boxes around the node.
		const draws = (el) =>
			el instanceof SVGSVGElement ||
			el instanceof HTMLImageElement ||
			[...el.childNodes].some((c) => c.nodeType === Node.TEXT_NODE && c.textContent.trim());
		const visible = (el) => {
			for (let e = el; e && !e.classList.contains('vue-flow__node'); e = e.parentElement) {
				const style = getComputedStyle(e);
				if (
					style.visibility === 'hidden' ||
					style.display === 'none' ||
					Number(style.opacity) === 0
				)
					return false;
			}
			return true;
		};
		const all = rects.concat(
			[...document.querySelectorAll('.vue-flow__node *')]
				.filter((el) => draws(el) && visible(el))
				.map((n) => n.getBoundingClientRect())
				.filter((r) => r.width > 0 && r.height > 0),
		);
		const left = Math.min(...all.map((r) => r.left));
		const top = Math.min(...all.map((r) => r.top));
		const right = Math.max(...all.map((r) => r.right));
		const bottom = Math.max(...all.map((r) => r.bottom));
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
