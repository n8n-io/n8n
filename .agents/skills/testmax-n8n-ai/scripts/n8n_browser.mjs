// Shared browser helpers: settings, Playwright launch, and n8n sign-in.
// Uses the Playwright copy in the repo test package. Falls back to the local Chrome install.
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../../..');
const require = createRequire(join(repo, 'packages/quality/testing/playwright/package.json'));
const { chromium, expect, selectors } = require('@playwright/test');
export { expect, selectors };
// pngjs, as Playwright bundles it. Image diffs use it, so the skills need no extra package.
export const loadPng = () =>
	createRequire(require.resolve('@playwright/test'))('playwright-core/lib/utilsBundle').PNG;

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
export const setting = (name, fallback) => process.env[name] || settings[name] || fallback;

export const baseUrl = setting('N8N_BASE_URL', 'http://localhost:5678').replace(/\/$/, '');

export async function launchBrowser() {
	const launch = existsSync(chromium.executablePath()) ? {} : { channel: 'chrome' };
	return await chromium.launch({ headless: true, ...launch });
}

export async function signIn(page) {
	await page.goto(`${baseUrl}/signin`);
	await page
		.getByRole('textbox', { name: 'Email' })
		.fill(setting('N8N_EVAL_EMAIL', 'nathan@n8n.io'));
	await page
		.getByRole('textbox', { name: 'Password' })
		.fill(setting('N8N_EVAL_PASSWORD', 'PlaywrightTest123'));
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();
	await page.waitForURL((url) => !url.pathname.startsWith('/signin'), { timeout: 30_000 });
}
