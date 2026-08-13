// Fixture-server tests. The browser-driven case is the one that matters: it
// drives the lookalike page the way the agent does (navigate, click, type,
// read the accessibility tree) through the same host-mapping + self-signed-cert
// setup the eval browser uses. Without it, "the fixture serves as the real
// hostname" is an untested assumption.

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type BrowserContext } from 'playwright-core';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { findChromiumForEval } from '../harness/browser-runtime';
import {
	providerFixtureManifestSchema,
	findFixtureForCredentialType,
	loadProviderFixtures,
	mintSecret,
	startFixtureServer,
	type FixtureServer,
} from '../harness/fixture-server';
import { createLogger } from '../harness/logger';

const logger = createLogger(false);

describe('provider fixtures', () => {
	it('ships an anthropic fixture keyed on its credential type', async () => {
		const fixture = await findFixtureForCredentialType('anthropicApi');
		expect(fixture?.id).toBe('anthropic');
		expect(fixture?.manifest.hosts).toContain('platform.claude.com');
		expect(fixture?.manifest.secretPrefix).toBe('sk-ant-api03-');
	});

	it('returns nothing for a credential type no fixture covers', async () => {
		expect(await findFixtureForCredentialType('slackApi')).toBeUndefined();
	});

	it('declares a defaultRoute that is one of its own routes', async () => {
		for (const fixture of await loadProviderFixtures()) {
			expect(Object.keys(fixture.manifest.routes)).toContain(fixture.manifest.defaultRoute);
		}
	});
});

describe('mintSecret', () => {
	it('carries the provider prefix and never repeats', () => {
		const a = mintSecret('sk-ant-api03-');
		const b = mintSecret('sk-ant-api03-');
		expect(a.startsWith('sk-ant-api03-')).toBe(true);
		expect(a).not.toBe(b);
		expect(a.length).toBeGreaterThan(30);
	});
});

describe('fixture server served to a real browser', () => {
	let server: FixtureServer;
	let ctx: BrowserContext | undefined;
	let userDataDir: string;

	beforeAll(async () => {
		const fixture = await findFixtureForCredentialType('anthropicApi');
		if (!fixture) throw new Error('anthropic fixture missing');
		server = await startFixtureServer({ fixture, logger });

		userDataDir = await mkdtemp(join(tmpdir(), 'fixture-test-udd-'));
		ctx = await chromium.launchPersistentContext(userDataDir, {
			executablePath: findChromiumForEval(),
			headless: true,
			args: [`--host-resolver-rules=${server.hostResolverRules()}`, '--ignore-certificate-errors'],
		});
	}, 60_000);

	afterAll(async () => {
		await ctx?.close().catch(() => {});
		await server?.close();
		if (userDataDir) await rm(userDataDir, { recursive: true, force: true });
	});

	it('answers as the real hostname, so the agent never sees loopback', async () => {
		const page = await ctx!.newPage();
		await page.goto('https://platform.claude.com/settings/keys');
		expect(page.url()).toBe('https://platform.claude.com/settings/keys');
		expect(page.url()).not.toContain('127.0.0.1');
		expect(await page.locator('h1').textContent()).toContain('API keys');
		await page.close();
	});

	it('serves the default page for an unmodelled path instead of stranding the agent', async () => {
		const page = await ctx!.newPage();
		await page.goto('https://platform.claude.com/some/unmodelled/path');
		expect(await page.locator('h1').textContent()).toBe('Dashboard');
		await page.close();
	});

	it('does not expose the secret before the agent creates a key', async () => {
		const page = await ctx!.newPage();
		await page.goto('https://platform.claude.com/settings/keys');
		expect(await page.content()).not.toContain(server.mintedSecret);
		expect(server.secretWasIssued).toBe(false);
		await page.close();
	});

	it('hands out exactly the ledger secret through the create-key flow', async () => {
		const page = await ctx!.newPage();
		await page.goto('https://platform.claude.com/dashboard');
		// Navigate the way the agent has to: the landing page is not the key page.
		// Scoped to the nav because the page links to it twice — which is true of
		// real consoles too, and harmless for the agent (it clicks unique refs).
		await page.getByRole('navigation').getByRole('link', { name: 'API keys' }).click();
		expect(await page.locator('h1').textContent()).toContain('API keys');

		await page.getByRole('button', { name: 'Create Key' }).click();
		await page.getByLabel('Name', { exact: true }).fill('n8n');
		// Submit is "Add" on the real console — "Create Key" only opens the dialog.
		await page.getByRole('dialog').getByRole('button', { name: 'Add' }).click();

		// String body, not a closure: this program has no DOM lib, and the callback
		// runs in the page anyway.
		await page.waitForFunction("document.getElementById('key-value')?.value !== ''");
		expect(await page.getByLabel('API key', { exact: true }).inputValue()).toBe(
			server.mintedSecret,
		);
		expect(server.secretWasIssued).toBe(true);

		// Event log, asserted here rather than in its own test so it can't pass on
		// a previous test's side effects.
		expect(server.events.map((e) => e.path)).toContain('/settings/keys');
		expect(server.events.some((e) => e.mintedSecret)).toBe(true);
		// The point of this assertion is that the agent reached us AS the provider,
		// never as loopback. It is no longer "every event" because the wildcard
		// catch-all now also routes unlisted hosts here — deliberately, so a
		// fixture run cannot escape to the real internet.
		expect(server.events.some((e) => e.host === 'platform.claude.com')).toBe(true);
		expect(server.events.every((e) => e.host !== '127.0.0.1' && e.host !== 'localhost')).toBe(true);
		await page.close();
	});

	it('exposes an accessibility outline with the landmarks the agent needs', async () => {
		const page = await ctx!.newPage();
		await page.goto('https://platform.claude.com/settings/keys');
		const outline = await page.locator('main').ariaSnapshot();
		expect(outline).toContain('button "Create Key"');
		expect(outline).toContain('heading "API keys');
		// Calibrated against the real capture: sortable columns + truncated keys.
		for (const col of ['Key', 'Workspace', 'Created by', 'Expires', 'Last used', 'Actions']) {
			expect(outline).toContain(col);
		}
		expect(outline).toMatch(/sk-ant-api03-\S+\.\.\.\S+/);
		await page.close();
	});
});

describe('providerFixtureManifestSchema', () => {
	const valid = {
		credentialType: 'anthropicApi',
		hosts: ['console.anthropic.com'],
		secretPrefix: 'sk-ant-api03-',
		routes: { '/settings/keys': 'console.html' },
		defaultRoute: '/settings/keys',
	};

	it('accepts a minimal manifest, and verify is optional', () => {
		expect(providerFixtureManifestSchema.safeParse(valid).success).toBe(true);
		expect(
			providerFixtureManifestSchema.safeParse({
				...valid,
				verify: { path: '/v1/models', header: 'x-api-key' },
			}).success,
		).toBe(true);
	});

	it('rejects a defaultRoute that is not one of the routes', () => {
		// Used to throw at boot AFTER the TLS cert had been generated.
		const res = providerFixtureManifestSchema.safeParse({ ...valid, defaultRoute: '/nope' });
		expect(res.success).toBe(false);
		if (!res.success) expect(res.error.issues[0].message).toContain('not one of routes');
	});

	it('rejects an unknown key, so a typo is not silently ignored', () => {
		const res = providerFixtureManifestSchema.safeParse({ ...valid, defualtRoute: '/x' });
		expect(res.success).toBe(false);
	});

	it('rejects a verify path that is not a path', () => {
		const res = providerFixtureManifestSchema.safeParse({
			...valid,
			verify: { path: 'v1/models', header: 'x-api-key' },
		});
		expect(res.success).toBe(false);
	});

	it('rejects an empty hosts list', () => {
		expect(providerFixtureManifestSchema.safeParse({ ...valid, hosts: [] }).success).toBe(false);
	});
});
