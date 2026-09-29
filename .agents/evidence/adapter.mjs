// Evidence adapter for the n8n repository.
// The `quality-evidence-packet` agent skill (n8n-agent-skills) discovers this file. It tells
// the skill how to start n8n, sign in, rebuild after a change, and which helpers capture specs
// get. The skill ships a copy as assets/n8n.adapter.mjs; keep the two in step.
// Contract: n8n-agent-skills plugins/quality/skills/evidence-packet/references/adapter.md
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const OWNER_EMAIL = 'evidence@example.com';

// One route per context and URL. Every call adds to the same patch, so a later override
// (for example `enableAiAssistant()` after `overrideSettings()`) never discards an earlier one.
const patches = new WeakMap();

/** Merges `patch` into top-level keys of a `{ data }` JSON response, for one browser context. */
async function overrideJson(context, url, patch) {
	if (!patches.has(context)) patches.set(context, new Map());
	const byUrl = patches.get(context);
	const known = byUrl.has(url);
	const merged = byUrl.get(url) ?? {};
	for (const [key, value] of Object.entries(patch)) merged[key] = { ...merged[key], ...value };
	byUrl.set(url, merged);
	if (known) return;
	await context.route(url, async (route) => {
		const response = await route.fetch();
		const json = await response.json();
		const data = { ...json.data };
		for (const [key, value] of Object.entries(byUrl.get(url)))
			data[key] = { ...data[key], ...value };
		await route.fulfill({ response, json: { ...json, data } });
	});
}

export default {
	name: 'n8n',
	// n8n marks elements with data-test-id, as packages/testing/playwright does.
	testIdAttribute: 'data-test-id',
	// Resolve @playwright/test from the repo's own Playwright package.
	playwrightFrom: 'packages/testing/playwright',
	// Browsers from `turbo run install-browsers`, cached on .playwright-version.
	browsersPath: 'packages/testing/playwright/.playwright-browsers',
	installBrowsers: 'pnpm turbo run install-browsers --filter=n8n-playwright',

	instance: {
		requires: {
			file: 'packages/cli/dist/index.js',
			hint: 'Build first: pnpm build > build.log 2>&1',
		},
		// Started detached from the repo root; the core waits for readyPath, then calls setup.
		command: ({ port, dataDir }) => ({
			args: ['packages/cli/bin/n8n', 'start'],
			env: {
				N8N_USER_FOLDER: dataDir,
				N8N_PORT: String(port),
				N8N_DIAGNOSTICS_ENABLED: 'false',
				N8N_PERSONALIZATION_ENABLED: 'false',
				N8N_VERSION_NOTIFICATIONS_ENABLED: 'false',
			},
		}),
		// While it starts, n8n answers every path with a 200 "n8n is starting up" HTML page,
		// then serves REST routes before the editor. Wait for real JSON and the real editor.
		ready: async (baseUrl) => {
			const signal = () => AbortSignal.timeout(3000);
			const settings = await fetch(`${baseUrl}/rest/settings`, { signal: signal() });
			if (!(settings.headers.get('content-type') ?? '').includes('application/json')) return false;
			const auth = await fetch(`${baseUrl}/rest/login`, { signal: signal() });
			if (auth.status !== 200 && auth.status !== 401) return false;
			const editor = await fetch(`${baseUrl}/signin`, { signal: signal() });
			return editor.ok && !(await editor.text()).includes('n8n is starting up');
		},
		options: { 'no-owner': 'Skip the owner account, so /setup stays reachable' },
		// Throwaway credentials, generated for each instance.
		async setup({ baseUrl, options }) {
			if (options['no-owner']) return null;
			const owner = {
				email: OWNER_EMAIL,
				firstName: 'Evidence',
				lastName: 'Bot',
				password: `Ev${randomBytes(6).toString('hex')}9A`,
			};
			const response = await fetch(`${baseUrl}/rest/owner/setup`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(owner),
			});
			if (!response.ok) throw new Error(`Owner setup failed: HTTP ${response.status}`);
			const created = await response.json().catch(() => null);
			if (!created?.data?.id)
				throw new Error('Owner setup did not return a user. Is the instance fully started?');
			return { email: owner.email, password: owner.password };
		},
	},

	/** Signs a browser context in through the API, before tracing starts. */
	async signIn({ request, baseUrl, credentials }) {
		const response = await request.post(`${baseUrl}/rest/login`, {
			data: { emailOrLdapLoginId: credentials.email, password: credentials.password },
		});
		if (!response.ok()) throw new Error(`Sign-in failed: HTTP ${response.status()}`);
	},

	// First matching rule wins. Paths are relative to the repo root.
	rebuild: [
		{ paths: ['packages/frontend/editor-ui/'], run: 'pnpm --filter n8n-editor-ui build' },
		{ paths: ['packages/frontend/'], run: 'pnpm build --filter n8n-editor-ui...' },
		{ paths: ['packages/'], run: 'pnpm build' },
	],

	helperNames: [
		'overrideSettings',
		'overrideModuleSettings',
		'enableAiAssistant',
		'createWorkflow',
		'publishWorkflow',
	],
	/** Passed to capture specs as `app`. */
	helpers: ({ context, repo }) => ({
		/** Deep-merges frontend settings, as the repo E2E fixture does. */
		overrideSettings: (patch) => overrideJson(context, '**/rest/settings', patch),
		overrideModuleSettings: (patch) => overrideJson(context, '**/rest/module-settings', patch),
		enableAiAssistant: async () => {
			await overrideJson(context, '**/rest/settings', {
				aiAssistant: { enabled: true, setup: true, cloudUbbEnabled: false },
			});
			await overrideJson(context, '**/rest/module-settings', { 'instance-ai': { enabled: false } });
		},
		/** Creates a workflow through the API. `file` is a JSON file in packages/testing/playwright/workflows. */
		async createWorkflow({ file, name, addNodes = [] }) {
			const workflow = file
				? JSON.parse(
						fs.readFileSync(path.join(repo, 'packages/testing/playwright/workflows', file), 'utf8'),
					)
				: { nodes: [], connections: {} };
			const response = await context.request.post('/rest/workflows', {
				data: {
					name: name ?? workflow.name ?? 'Evidence workflow',
					nodes: [...workflow.nodes, ...addNodes],
					connections: workflow.connections ?? {},
					settings: {},
				},
			});
			if (!response.ok()) throw new Error(`Workflow create failed: HTTP ${response.status()}`);
			return (await response.json()).data.id;
		},
		/**
		 * Publishes (activates) a workflow, so its production webhooks and forms answer.
		 * Registration is asynchronous: pass `readyPath` (for example `/form/<path>`) to wait
		 * until it answers. Give each webhook and form a unique path; a reused one returns 409.
		 * A Form Trigger serves `/form/<path>` when its `options.path` is set.
		 */
		async publishWorkflow(workflowId, { readyPath, timeoutMs = 15_000 } = {}) {
			const current = await context.request.get(`/rest/workflows/${workflowId}`);
			if (!current.ok()) throw new Error(`Workflow read failed: HTTP ${current.status()}`);
			const { versionId } = (await current.json()).data;
			const published = await context.request.post(`/rest/workflows/${workflowId}/activate`, {
				data: { versionId },
			});
			if (!published.ok())
				throw new Error(
					`Workflow publish failed: HTTP ${published.status()} ${(await published.text()).slice(0, 200)}`,
				);
			if (!readyPath) return;
			for (const deadline = Date.now() + timeoutMs; Date.now() < deadline; ) {
				if ((await context.request.get(readyPath)).ok()) return;
				await new Promise((resolve) => setTimeout(resolve, 250));
			}
			throw new Error(`${readyPath} did not answer within ${timeoutMs / 1000}s after publishing`);
		},
	}),
};
