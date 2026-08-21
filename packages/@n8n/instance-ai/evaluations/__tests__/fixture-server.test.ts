// Fixture-server tests. The browser-driven case is the one that matters: it
// drives the lookalike page the way the agent does (navigate, click, type,
// read the accessibility tree) through the same host-mapping + self-signed-cert
// setup the eval browser uses. Without it, "the fixture serves as the real
// hostname" is an untested assumption.

import { jsonParse } from 'n8n-workflow';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type BrowserContext } from 'playwright-core';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { findChromiumForEval, fixtureInterceptionArgs } from '../harness/browser-runtime';
import {
	providerFixtureManifestSchema,
	findFixtureForCredentialType,
	loadProviderFixtures,
	matchRoute,
	MINT_PATH,
	mintSecret,
	startFixtureServer,
	type FixtureServer,
} from '../harness/fixture-server';
import { createLogger } from '../harness/logger';

const logger = createLogger(false);

/**
 * Boot a fixture server + a browser aimed at it, and register the teardown.
 *
 * Uses `fixtureInterceptionArgs` — the same builder `startBrowserRuntime` uses —
 * so these tests pin the interception setup the eval browser really gets,
 * including the loopback EXCLUDE rules. Hand-assembled args drifted from it.
 */
function fixtureBrowser(credentialType: string) {
	const handle: { server?: FixtureServer; ctx?: BrowserContext } = {};
	let userDataDir: string | undefined;

	beforeAll(async () => {
		const fixture = await findFixtureForCredentialType(credentialType);
		if (!fixture) throw new Error(`${credentialType} fixture missing`);
		const server = await startFixtureServer({ fixture, logger });
		handle.server = server;
		userDataDir = await mkdtemp(join(tmpdir(), `fixture-test-${fixture.id}-`));
		handle.ctx = await chromium.launchPersistentContext(userDataDir, {
			executablePath: findChromiumForEval(),
			headless: true,
			args: fixtureInterceptionArgs(server.hostResolverRules(), undefined),
		});
	}, 60_000);

	afterAll(async () => {
		await handle.ctx?.close().catch(() => {});
		await handle.server?.close();
		if (userDataDir) await rm(userDataDir, { recursive: true, force: true });
	});

	// Non-null at use: every `it` runs after beforeAll, and a failed boot throws
	// there rather than handing back a half-built handle.
	return handle as { server: FixtureServer; ctx: BrowserContext };
}

describe('provider fixtures', () => {
	// One row per shipped fixture. A hardcoded table still reds on a missing
	// fixture, because findFixtureForCredentialType returns undefined for a row
	// that has no directory.
	const SHIPPED = [
		{
			type: 'anthropicApi',
			id: 'anthropic',
			host: 'platform.claude.com',
			prefix: 'sk-ant-api03-',
			verify: { path: '/v1/models', header: 'x-api-key' },
		},
		{
			type: 'openAiApi',
			id: 'openai',
			host: 'platform.openai.com',
			prefix: 'sk-proj-',
			verify: { path: '/models', header: 'Authorization', scheme: 'Bearer' },
		},
		{
			type: 'googlePalmApi',
			id: 'gemini',
			host: 'aistudio.google.com',
			// Google's current shape, not the legacy `AIza…` one.
			prefix: 'AQ.',
			// Base URL lives in `host`, and the key travels as a query parameter.
			urlField: 'host',
			verify: { path: '/v1beta/models', query: 'key' },
		},
		// No `verify`: slackApi's test hardcodes its baseURL, so the stand-in can
		// never be aimed at it. The value check reports itself unverifiable.
		{ type: 'slackApi', id: 'slack', host: 'api.slack.com', prefix: 'xoxb-' },
	];

	it.each(SHIPPED)('ships the $id fixture keyed on $type', async (row) => {
		const fixture = await findFixtureForCredentialType(row.type);
		expect(fixture?.id).toBe(row.id);
		expect(fixture?.manifest.hosts).toContain(row.host);
		expect(fixture?.manifest.secretPrefix).toBe(row.prefix);
		expect(fixture?.manifest.urlField).toBe(row.urlField ?? 'url');
		expect(fixture?.manifest.verify).toEqual(row.verify);
	});

	// n8n serializes every credential type's own test request, so the manifest's
	// transcription of it can be CHECKED rather than trusted. Without this the
	// table above only pins what someone typed on the day, and an upstream change
	// to `test.request` silently downgrades the value check to "unverifiable".
	const TYPE_FILES = [
		join(__dirname, '..', '..', '..', '..', 'nodes-base', 'dist', 'types', 'credentials.json'),
		join(__dirname, '..', '..', '..', 'nodes-langchain', 'dist', 'types', 'credentials.json'),
	];

	it.skipIf(!TYPE_FILES.some(existsSync))(
		"matches each credential's own test.request (needs built dist/types)",
		async () => {
			const types = new Map<string, { baseURL?: string; url?: string }>();
			for (const file of TYPE_FILES.filter(existsSync)) {
				for (const cred of jsonParse<
					Array<{
						name: string;
						test?: { request?: { baseURL?: string; url?: string } };
					}>
				>(await readFile(file, 'utf8'))) {
					if (cred.test?.request) types.set(cred.name, cred.test.request);
				}
			}

			const fixtures = await loadProviderFixtures();
			let checked = 0;
			for (const fixture of fixtures) {
				const request = types.get(fixture.manifest.credentialType);
				if (!request?.baseURL) continue;
				checked += 1;
				const interpolated = /\{\{\s*\$credentials\??\.(\w+)\s*\}\}/.exec(request.baseURL);

				if (!interpolated) {
					// Hardcoded baseURL: there is no field to substitute, so a `verify`
					// block could never be aimed at the stand-in.
					expect(fixture.manifest.verify, `${fixture.id} verify`).toBeUndefined();
					continue;
				}
				expect(fixture.manifest.urlField, `${fixture.id} urlField`).toBe(interpolated[1]);
				const suffix = request.baseURL.slice(interpolated.index + interpolated[0].length);
				expect(fixture.manifest.verify?.path, `${fixture.id} verify.path`).toBe(
					`${suffix}${request.url ?? ''}`,
				);
			}

			// Every shipped fixture must have been compared. Without this, a rename
			// or a change to the serialized shape makes every iteration `continue`
			// and the check passes having verified nothing.
			expect(checked, 'fixtures cross-checked against their credential type').toBe(fixtures.length);
		},
	);

	// The pages hardcode this path (they cannot import TS), and a rename would
	// make every fixture's create button silently do nothing: the POST would fall
	// through to the default page, which answers 200 with HTML, so `response.json()`
	// throws inside the page and the run reds as agent misbehaviour.
	it('serves the mint path every fixture page posts to', async () => {
		for (const fixture of await loadProviderFixtures()) {
			for (const file of Object.values(fixture.manifest.routes)) {
				const html = await readFile(join(fixture.dir, file), 'utf8');
				if (html.includes('__fixture__')) expect(html).toContain(MINT_PATH);
			}
		}
	});

	it('returns nothing for a credential type no fixture covers', async () => {
		expect(await findFixtureForCredentialType('notionApi')).toBeUndefined();
	});

	it('gives every fixture a credential type of its own', async () => {
		// Selection is BY credential type, so a duplicate would depend on readdir order.
		const types = (await loadProviderFixtures()).map((f) => f.manifest.credentialType);
		expect(types).toEqual([...new Set(types)]);
	});

	it('declares a defaultRoute that is one of its own routes', async () => {
		for (const fixture of await loadProviderFixtures()) {
			expect(Object.keys(fixture.manifest.routes)).toContain(fixture.manifest.defaultRoute);
		}
	});
});

describe('matchRoute', () => {
	const routes = ['/apps', '/apps/:appId/general', '/apps/:appId/install-on-team'];

	it('resolves a parameter segment to any value', () => {
		expect(matchRoute(routes, '/apps/A0BQ7AWFNHM/general')).toBe('/apps/:appId/general');
		expect(matchRoute(routes, '/apps/A0EVALAPP/install-on-team')).toBe(
			'/apps/:appId/install-on-team',
		);
	});

	it('prefers an exact route over a pattern that would also match', () => {
		expect(matchRoute(['/apps/:appId/general', '/apps/fixed/general'], '/apps/fixed/general')).toBe(
			'/apps/fixed/general',
		);
	});

	it('does not match across segment boundaries', () => {
		// Without this a console's whole URL space collapses onto one page, and the
		// agent gets a plausible-looking wrong page instead of the default.
		expect(matchRoute(routes, '/apps/A0BQ7AWFNHM/general/extra')).toBeUndefined();
		expect(matchRoute(routes, '/apps/A0BQ7AWFNHM')).toBeUndefined();
		expect(matchRoute(routes, '/apps/A0BQ7AWFNHM/oauth')).toBeUndefined();
	});

	it('still resolves plain routes', () => {
		expect(matchRoute(routes, '/apps')).toBe('/apps');
		expect(matchRoute(routes, '/nope')).toBeUndefined();
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
	const fx = fixtureBrowser('anthropicApi');

	it('answers as the real hostname, so the agent never sees loopback', async () => {
		const page = await fx.ctx.newPage();
		await page.goto('https://platform.claude.com/settings/keys');
		expect(page.url()).toBe('https://platform.claude.com/settings/keys');
		expect(page.url()).not.toContain('127.0.0.1');
		expect(await page.locator('h1').textContent()).toContain('API keys');
		await page.close();
	});

	it('serves the default page for an unmodelled path instead of stranding the agent', async () => {
		const page = await fx.ctx.newPage();
		await page.goto('https://platform.claude.com/some/unmodelled/path');
		expect(await page.locator('h1').textContent()).toBe('Dashboard');
		await page.close();
	});

	it('does not expose the secret before the agent creates a key', async () => {
		const page = await fx.ctx.newPage();
		await page.goto('https://platform.claude.com/settings/keys');
		expect(await page.content()).not.toContain(fx.server.mintedSecret);
		expect(fx.server.secretWasIssued).toBe(false);
		await page.close();
	});

	it('hands out exactly the ledger secret through the create-key flow', async () => {
		const page = await fx.ctx.newPage();
		await page.goto('https://platform.claude.com/dashboard');
		// Navigate the way the agent has to: the landing page is not the key page.
		// Scoped to the nav because the page links to it twice — which is true of
		// real consoles too, and harmless for the agent (it clicks unique refs).
		await page.getByRole('navigation').getByRole('link', { name: 'API keys' }).click();
		expect(await page.locator('h1').textContent()).toContain('API keys');

		await page.getByRole('button', { name: 'Create Key' }).click();
		await page.getByLabel('Name', { exact: true }).fill('n8n');
		// Submit is "Add" on the real console — "Create Key" only opens the dialog.
		const add = page.getByRole('dialog').getByRole('button', { name: 'Add' });
		// The real console disables Add until Expires is set (NODE-5755): a name
		// alone is not enough, and clicking anyway does nothing.
		expect(await add.isDisabled()).toBe(true);
		// Click-driven, as in the real trace: this is a listbox, not a native select.
		await page.getByRole('combobox', { name: 'Expires' }).click();
		await page.getByRole('option', { name: '30 days' }).click();
		expect(await add.isDisabled()).toBe(false);
		await add.click();

		// String body, not a closure: this program has no DOM lib, and the callback
		// runs in the page anyway.
		await page.waitForFunction("document.getElementById('key-value')?.value !== ''");
		expect(await page.getByLabel('API key', { exact: true }).inputValue()).toBe(
			fx.server.mintedSecret,
		);
		expect(fx.server.secretWasIssued).toBe(true);

		// Event log, asserted here rather than in its own test so it can't pass on
		// a previous test's side effects.
		expect(fx.server.events.map((e) => e.path)).toContain('/settings/keys');
		expect(fx.server.events.some((e) => e.mintedSecret)).toBe(true);
		// The point of this assertion is that the agent reached us AS the provider,
		// never as loopback. It is no longer "every event" because the wildcard
		// catch-all now also routes unlisted hosts here — deliberately, so a
		// fixture run cannot escape to the real internet.
		expect(fx.server.events.some((e) => e.host === 'platform.claude.com')).toBe(true);
		expect(fx.server.events.every((e) => e.host !== '127.0.0.1' && e.host !== 'localhost')).toBe(
			true,
		);
		await page.close();
	});

	it('surfaces the disabled submit AS disabled, so the gap is diagnosable', async () => {
		// Case 593 turns on this: the dead end has to be visible in the tree the
		// agent reads, or the gap is undiagnosable rather than just open.
		const page = await fx.ctx.newPage();
		await page.goto('https://platform.claude.com/settings/keys');
		await page.getByRole('button', { name: 'Create Key' }).click();
		const outline = await page.getByRole('dialog').ariaSnapshot();
		expect(outline).toMatch(/button "Add".*disabled/);
		await page.close();
	});

	it('exposes an accessibility outline with the landmarks the agent needs', async () => {
		const page = await fx.ctx.newPage();
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

// Same contract as the anthropic block, against the other console. Not shared
// with it: the differences between the consoles are the point.
describe('openai fixture served to a real browser', () => {
	const fx = fixtureBrowser('openAiApi');

	it('answers as the real hostname, so the agent never sees loopback', async () => {
		const page = await fx.ctx.newPage();
		await page.goto('https://platform.openai.com/api-keys');
		expect(page.url()).toBe('https://platform.openai.com/api-keys');
		expect(await page.locator('h1').textContent()).toBe('API keys');
		await page.close();
	});

	it('keeps the two "create...key" buttons distinguishable', async () => {
		const page = await fx.ctx.newPage();
		await page.goto('https://platform.openai.com/api-keys');
		// Closed, the submit is not in the tree at all — only the opener is.
		expect(await page.getByRole('button', { name: 'Create' }).count()).toBe(1);

		await page.getByRole('button', { name: 'Create new secret key' }).click();
		// Open, a loose match hits BOTH: that is the hazard, and the exact names
		// have to keep them apart.
		expect(await page.getByRole('button', { name: 'Create' }).count()).toBe(2);
		expect(await page.getByRole('button', { name: 'Create new secret key' }).count()).toBe(1);
		expect(await page.getByRole('button', { name: 'Create secret key', exact: true }).count()).toBe(
			1,
		);
		await page.close();
	});

	it('hands out exactly the ledger secret through the create-key flow', async () => {
		const page = await fx.ctx.newPage();
		await page.goto('https://platform.openai.com/home');
		// Navigate the way the agent has to: the landing page is not the key page.
		await page.getByRole('complementary').getByRole('link', { name: 'API Keys' }).click();
		expect(await page.locator('h1').textContent()).toBe('API keys');

		await page.getByRole('button', { name: 'Create new secret key' }).click();
		const dialog = page.getByRole('dialog').filter({ hasText: 'Create new secret key' });
		// Name is optional here — the contrast with anthropic's gated Add.
		expect(await dialog.getByRole('button', { name: 'Create secret key' }).isDisabled()).toBe(
			false,
		);
		await page.getByPlaceholder('My Test Key').fill('n8n');
		await dialog.getByRole('button', { name: 'Create secret key' }).click();

		await page.waitForFunction("document.getElementById('key-value')?.value !== ''");
		const reveal = page.getByRole('dialog').filter({ hasText: 'Save your key' });
		expect(await reveal.getByRole('textbox').inputValue()).toBe(fx.server.mintedSecret);
		expect(fx.server.secretWasIssued).toBe(true);

		expect(fx.server.events.some((e) => e.mintedSecret)).toBe(true);
		expect(fx.server.events.some((e) => e.host === 'platform.openai.com')).toBe(true);
		expect(fx.server.events.every((e) => e.host !== '127.0.0.1' && e.host !== 'localhost')).toBe(
			true,
		);
		await page.close();
	});

	it('shows the new key TRUNCATED in the list, never in full', async () => {
		// Creates the key on THIS page: the assertion is about the row the create
		// flow renders, and a fresh page never contains the secret in the first
		// place, so asserting there proves nothing.
		const page = await fx.ctx.newPage();
		await page.goto('https://platform.openai.com/api-keys');
		await page.getByRole('button', { name: 'Create new secret key' }).click();
		await page
			.getByRole('dialog')
			.getByRole('button', { name: 'Create secret key', exact: true })
			.click();
		await page.waitForFunction("document.getElementById('key-value')?.value !== ''");

		const outline = await page.locator('table').ariaSnapshot();
		expect(outline).toMatch(/sk-\.\.\.\w{4}/);
		expect(outline).not.toContain(fx.server.mintedSecret);
		// Nor may a derived column smuggle a run of the key into the tree.
		expect(outline).not.toContain(fx.server.mintedSecret.slice(-16));
		await page.close();
	});

	it('renders a name containing markup as text, not as markup', async () => {
		// The name is free-form agent input. Interpolated into the row's HTML it
		// would corrupt the table the truncation assertions read.
		const page = await fx.ctx.newPage();
		await page.goto('https://platform.openai.com/api-keys');
		await page.getByRole('button', { name: 'Create new secret key' }).click();
		await page.getByPlaceholder('My Test Key').fill('<b>bold</b> & co');
		await page
			.getByRole('dialog')
			.getByRole('button', { name: 'Create secret key', exact: true })
			.click();
		await page.waitForFunction("document.getElementById('key-value')?.value !== ''");

		expect(await page.locator('#key-rows tr').first().textContent()).toContain('<b>bold</b> & co');
		expect(await page.locator('#key-rows b').count()).toBe(0);
		await page.close();
	});

	it('exposes an accessibility outline with the landmarks the agent needs', async () => {
		const page = await fx.ctx.newPage();
		await page.goto('https://platform.openai.com/api-keys');
		const outline = await page.locator('main').ariaSnapshot();
		expect(outline).toContain('button "Create new secret key"');
		expect(outline).toContain('heading "API keys"');
		// Calibrated against the real capture.
		for (const col of ['Name', 'Status', 'Tracking ID', 'Secret Key', 'Created', 'Permissions']) {
			expect(outline).toContain(col);
		}
		await page.close();
	});
});

// The awkward console: two blocking overlays, no role=dialog, key as text.
describe('gemini fixture served to a real browser', () => {
	const fx = fixtureBrowser('googlePalmApi');

	it('blocks the page behind BOTH overlays until each is dismissed', async () => {
		const page = await fx.ctx.newPage();
		await page.goto('https://aistudio.google.com/apikey');
		expect(await page.getByRole('button', { name: 'Create API key' }).isVisible()).toBe(false);

		await page.getByRole('button', { name: 'Close guided tour' }).click();
		expect(await page.getByRole('button', { name: 'Create API key' }).isVisible()).toBe(false);

		await page.getByRole('button', { name: 'OK, got it' }).click();
		expect(await page.getByRole('button', { name: 'Create API key' }).isVisible()).toBe(true);
		await page.close();
	});

	async function openConsole() {
		const page = await fx.ctx.newPage();
		await page.goto('https://aistudio.google.com/apikey');
		await page.getByRole('button', { name: 'Close guided tour' }).click();
		await page.getByRole('button', { name: 'OK, got it' }).click();
		return page;
	}

	it('hands out exactly the ledger secret, as TEXT rather than a field', async () => {
		const page = await openConsole();
		await page.getByRole('button', { name: 'Create API key' }).click();
		await page.getByLabel('Name your key').fill('n8n');
		await page.getByRole('button', { name: 'Create key', exact: true }).click();

		await page.waitForFunction("document.getElementById('key-value')?.textContent !== ''");
		// textContent, not inputValue — the key is a text node here.
		expect(await page.locator('#key-value').textContent()).toBe(fx.server.mintedSecret);
		expect(fx.server.mintedSecret.startsWith('AQ.')).toBe(true);
		expect(fx.server.secretWasIssued).toBe(true);
		expect(fx.server.events.some((e) => e.host === 'aistudio.google.com')).toBe(true);
		await page.close();
	});

	it('keeps the reveal panel findable even though it is not a role=dialog', async () => {
		const page = await openConsole();
		expect(await page.getByRole('dialog').count()).toBe(0);
		await page.getByRole('button', { name: 'Create API key' }).click();
		expect(await page.getByRole('dialog').count()).toBe(0);
		expect(await page.getByLabel('Create a new key Close dialog').count()).toBe(1);
		await page.close();
	});

	it('renders a name containing markup as text, not as markup', async () => {
		const page = await openConsole();
		await page.getByRole('button', { name: 'Create API key' }).click();
		await page.getByLabel('Name your key').fill('<i>italic</i> & co');
		await page.getByRole('button', { name: 'Create key', exact: true }).click();
		await page.waitForFunction("document.getElementById('key-value')?.textContent !== ''");

		expect(await page.locator('#key-rows tr').first().textContent()).toContain(
			'<i>italic</i> & co',
		);
		expect(await page.locator('#key-rows i').count()).toBe(0);
		await page.close();
	});

	it('shows only the last four characters in the list', async () => {
		// Mint on this page first — see the openai equivalent.
		const page = await openConsole();
		await page.getByRole('button', { name: 'Create API key' }).click();
		await page.getByLabel('Name your key').fill('n8n');
		await page.getByRole('button', { name: 'Create key', exact: true }).click();
		await page.waitForFunction("document.getElementById('key-value')?.textContent !== ''");

		const outline = await page.locator('table').ariaSnapshot();
		expect(outline).toMatch(/button "\.\.\.\w{4}"/);
		expect(outline).not.toContain(fx.server.mintedSecret);
		await page.close();
	});
});

// Multi-page, unlike the other three: the token only exists after installing.
describe('slack fixture served to a real browser', () => {
	const fx = fixtureBrowser('slackApi');

	it('keeps the manifest editor click-trapped but typeable', async () => {
		// The live reproduction for case 599: the focusable input sits under the
		// rendered surface, so a click never passes the hit-test while fill()
		// does. Short timeout here — the real one costs 30s.
		const page = await fx.ctx.newPage();
		await page.goto('https://api.slack.com/apps');
		await page.getByRole('button', { name: 'Create New App' }).click();
		await page.getByRole('button', { name: 'From a manifest' }).click();

		await expect(page.locator('#manifest-input').click({ timeout: 1_000 })).rejects.toThrow(
			/Timeout|intercepts pointer events/,
		);
		await page.locator('#manifest-input').fill('{"display_information":{"name":"n8n"}}');
		expect(await page.locator('#manifest-input').inputValue()).toContain('display_information');
		await page.close();
	});

	it('leaves Next enabled — nothing here is gated on a required field', async () => {
		const page = await fx.ctx.newPage();
		await page.goto('https://api.slack.com/apps');
		await page.getByRole('button', { name: 'Create New App' }).click();
		await page.getByRole('button', { name: 'From a manifest' }).click();
		expect(await page.getByRole('button', { name: 'Next' }).isDisabled()).toBe(false);
		await page.close();
	});

	it('issues the ledger token only after Install to Workspace', async () => {
		const page = await fx.ctx.newPage();
		// An app id this fixture has never seen — the console mints one per app, and
		// the agent navigates by typing those URLs back.
		await page.goto('https://api.slack.com/apps/A0Q3ZK71LMN/install-on-team');
		expect(await page.content()).not.toContain(fx.server.mintedSecret);

		await page.getByRole('button', { name: 'Install to Workspace' }).click();
		await page.waitForFunction("document.getElementById('bot-token')?.value !== ''");
		expect(await page.getByLabel('Bot User OAuth Token').inputValue()).toBe(fx.server.mintedSecret);
		expect(fx.server.mintedSecret.startsWith('xoxb-')).toBe(true);
		expect(fx.server.secretWasIssued).toBe(true);
		await page.close();
	});

	it('reaches the token only through the multi-page flow', async () => {
		const page = await fx.ctx.newPage();
		await page.goto('https://api.slack.com/apps/A0Q3ZK71LMN/general');
		// Basic Information carries the OAuth2 credentials, never the bot token.
		expect(await page.content()).not.toContain(fx.server.mintedSecret);
		expect(await page.getByLabel('Client ID').inputValue()).toContain('.');
		await page.getByRole('link', { name: 'Install App' }).click();
		expect(await page.locator('h1').first().textContent()).toContain('OAuth Tokens');
		// The id survives the hop rather than reverting to a hardcoded one.
		expect(page.url()).toContain('/apps/A0Q3ZK71LMN/install-on-team');
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

	// The three providers agree on none of this — a manifest that could only
	// describe anthropic left the other two's value check unverifiable.
	it('accepts a query-param secret instead of a header', () => {
		expect(
			providerFixtureManifestSchema.safeParse({
				...valid,
				verify: { path: '/v1beta/models', query: 'key' },
			}).success,
		).toBe(true);
	});

	it('accepts a header scheme, for a credential that sends `Bearer <key>`', () => {
		expect(
			providerFixtureManifestSchema.safeParse({
				...valid,
				verify: { path: '/models', header: 'Authorization', scheme: 'Bearer' },
			}).success,
		).toBe(true);
	});

	it('rejects a verify block carrying neither a header nor a query param', () => {
		// The union has no arm without one of them, so this is structural — there is
		// no refinement message to assert, only that it cannot parse.
		expect(
			providerFixtureManifestSchema.safeParse({ ...valid, verify: { path: '/models' } }).success,
		).toBe(false);
	});

	it('rejects a scheme on the query arm, where it could never be honoured', () => {
		// `{path, query, scheme}` used to parse and then compare "Bearer <secret>"
		// against a query value — a permanent 401 reported as unverifiable.
		expect(
			providerFixtureManifestSchema.safeParse({
				...valid,
				verify: { path: '/v1beta/models', query: 'key', scheme: 'Bearer' },
			}).success,
		).toBe(false);
	});

	it('rejects a verify block carrying both — the stand-in must know where to look', () => {
		const res = providerFixtureManifestSchema.safeParse({
			...valid,
			verify: { path: '/models', header: 'x-api-key', query: 'key' },
		});
		expect(res.success).toBe(false);
	});

	it('accepts a urlField, for a credential whose base URL is not called `url`', () => {
		const res = providerFixtureManifestSchema.safeParse({ ...valid, urlField: 'host' });
		expect(res.success).toBe(true);
	});
});

// The listener n8n's credential test talks to. Getting this wrong silently
// discards the strongest of the three deterministic checks.
describe('the provider stand-in accepts each provider shape', () => {
	const SECRET = 'sk-test-0123456789abcdef';
	let dir: string;

	beforeAll(async () => {
		dir = await mkdtemp(join(tmpdir(), 'fixture-verify-'));
		await writeFile(
			join(dir, 'console.html'),
			'<!doctype html><html><body><h1>Keys</h1></body></html>',
		);
	});

	afterAll(async () => {
		if (dir) await rm(dir, { recursive: true, force: true });
	});

	async function withServer(
		verify: Record<string, string>,
		run: (server: FixtureServer) => void | Promise<void>,
	): Promise<void> {
		const server = await startFixtureServer({
			fixture: {
				id: 'under-test',
				dir,
				manifest: providerFixtureManifestSchema.parse({
					credentialType: 'x',
					hosts: ['console.example.com'],
					secretPrefix: 'sk-test-',
					routes: { '/keys': 'console.html' },
					defaultRoute: '/keys',
					verify,
				}),
			},
			logger,
			secret: SECRET,
		});
		try {
			await run(server);
		} finally {
			await server.close();
		}
	}

	it('accepts a bare header value, and refuses a truncated one', async () => {
		await withServer({ path: '/v1/models', header: 'x-api-key' }, async (server) => {
			const url = `${server.verifyBaseUrl}/v1/models`;
			expect((await fetch(url, { headers: { 'x-api-key': SECRET } })).status).toBe(200);
			expect((await fetch(url, { headers: { 'x-api-key': SECRET.slice(0, 12) } })).status).toBe(
				401,
			);
			expect(server.verifiedOk).toBe(true);
			expect(server.verifyAttempts).toBe(2);
		});
	});

	it('accepts a schemed header, so `Bearer <key>` is not read as a wrong key', async () => {
		await withServer(
			{ path: '/models', header: 'Authorization', scheme: 'Bearer' },
			async (server) => {
				const url = `${server.verifyBaseUrl}/models`;
				expect((await fetch(url, { headers: { Authorization: `Bearer ${SECRET}` } })).status).toBe(
					200,
				);
				// The bare key is the WRONG presentation for this credential type.
				expect((await fetch(url, { headers: { Authorization: SECRET } })).status).toBe(401);
			},
		);
	});

	it('accepts a query-param secret, which never reaches a header at all', async () => {
		await withServer({ path: '/v1beta/models', query: 'key' }, async (server) => {
			const base = `${server.verifyBaseUrl}/v1beta/models`;
			expect((await fetch(`${base}?key=${SECRET}`)).status).toBe(200);
			expect((await fetch(`${base}?key=nope`)).status).toBe(401);
			// A query-param provider must not be satisfiable by a header.
			expect((await fetch(base, { headers: { 'x-api-key': SECRET } })).status).toBe(401);
		});
	});
});
