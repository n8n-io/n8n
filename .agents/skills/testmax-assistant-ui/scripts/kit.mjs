// The helper object `t` that a scenario script receives. See SKILL.md for the full API.
//
//   export default async function (t) {
//     await t.step('Open the Assistant', () => t.goto());
//     await t.step('Send a prompt', () => t.send('Reply with exactly: OK'));
//     await t.step('Wait for the reply', () => t.waitForIdle());
//     await t.check('The reply shows', () => t.expect(t.ai.assistantMessages().first()).toBeVisible());
//     await t.capture('thread', { mask: [t.ai.assistantMessages()] });
//   }
//
// A step that throws ends the scenario. A check that fails is recorded and the scenario goes on.
// Each step and check writes a screenshot. The runner shows them in the report.
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect } from '../../testmax-n8n-ai/scripts/n8n_browser.mjs';

const THREAD_URL = /\/assistant\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/;
const RUN_GRACE_MS = 10_000;

/**
 * Replace the accessibility subtree of each masked element with one line. Masked texts alone keep
 * the structure, so a list with a different number of rows still shows as a change. Each subtree
 * replaces only its first unmasked match, so an unmasked element with the same content stays.
 */
function maskSubtrees(tree, subtrees) {
	const lines = tree.split('\n');
	for (const subtree of subtrees) {
		const sub = subtree.split('\n').filter((l) => l.trim());
		if (!sub.length || sub[0].startsWith('#')) continue;
		for (let i = 0; i + sub.length <= lines.length; i++) {
			if (!lines[i].endsWith(sub[0])) continue;
			const indent = lines[i].slice(0, lines[i].length - sub[0].length);
			if (indent.trim() || !sub.every((l, j) => lines[i + j] === indent + l)) continue;
			lines.splice(i, sub.length, `${indent}- text: "[masked]"`);
			break;
		}
	}
	return lines.join('\n');
}

/** The accessibility tree without the masked texts and the instance port, so branch and master compare. */
function maskTree(tree, texts) {
	let out = tree.replace(/localhost(:|%3A)\d+/g, 'localhost$1PORT');
	for (const text of [...texts].sort((a, b) => b.length - a.length))
		out = out.split(text).join('[masked]');
	return out;
}

export class StepFailed extends Error {}

/** Locators of the Instance AI page. They mirror pages/InstanceAiPage.ts in the Playwright tests. */
function locators(page) {
	const container = () => page.getByTestId('instance-ai-container');
	return {
		container,
		chatInput: () => container().getByRole('textbox').or(container().getByRole('combobox')),
		composer: () => container().getByTestId('instance-ai-composer'),
		sendButton: () => container().getByTestId('instance-ai-send-button'),
		stopButton: () => container().getByTestId('instance-ai-stop-button'),
		userMessages: () => container().getByTestId('instance-ai-user-message'),
		assistantMessages: () => container().getByTestId('instance-ai-assistant-message'),
		assistantText: (text) =>
			container().getByTestId('instance-ai-assistant-message').getByText(text),
		panelText: (text) => container().getByText(text),
		emptyState: () => container().getByTestId('instance-ai-empty-state'),
		statusBar: () => container().getByTestId('instance-ai-status-bar'),
		sidebarToggle: () => container().getByTestId('instance-ai-sidebar-toggle'),
		threadList: () => page.getByTestId('instance-ai-thread-list'),
		newThreadButton: () =>
			page
				.getByTestId('project-instance-ai-menu-item')
				.getByRole('menuitem', { name: 'Assistant', exact: true }),
		mentionButton: () => container().getByTestId('instance-ai-mention-button'),
		mentionMenu: () => page.getByTestId('instance-ai-mention-menu-content'),
		fileInput: () => container().locator('input[type="file"]'),
		approveButton: () => container().getByTestId('approval-card-allow-once'),
		alwaysAllowButton: () => container().getByTestId('approval-card-always-allow'),
		denyButton: () => container().getByTestId('approval-card-deny'),
		domainAllowOnce: () => container().getByTestId('domain-access-allow-once'),
		planApproveButton: () => container().getByTestId('instance-ai-plan-approve'),
		credentialContinue: () => container().getByTestId('instance-ai-credential-continue-button'),
		previewPanel: () => container().getByTestId('instance-ai-preview-panel'),
		previewCanvasNodes: () =>
			container().getByTestId('workflow-canvas-host').locator('[data-test-id="canvas-node"]'),
		previewToggle: () => container().getByTestId('instance-ai-artifacts-preview-toggle'),
		artifactsSidebar: () => container().getByTestId('instance-ai-artifacts-sidebar'),
		outOfCredits: () => container().getByTestId('instance-ai-out-of-credits'),
	};
}

export function createKit({ page, out, baseUrl, autoConfirm, emit }) {
	const started = Date.now();
	const steps = [];
	const threads = [];
	const prompts = [];
	const ai = locators(page);
	let stopped = false;
	mkdirSync(join(out, 'captures'), { recursive: true });

	const seconds = () => (Date.now() - started) / 1000;
	function save() {
		const partial = join(out, 'steps.tmp.json');
		writeFileSync(partial, JSON.stringify(steps, null, 1));
		renameSync(partial, join(out, 'steps.json'));
	}
	async function shot(file) {
		try {
			await page.screenshot({ path: join(out, file) });
			return file;
		} catch {
			return null;
		}
	}
	function message(error) {
		return String(error?.message ?? error)
			.replace(/\u001b\[[0-9;]*m/g, '')
			.slice(0, 2000);
	}

	async function record(kind, title, fn) {
		if (stopped) throw new StepFailed('The scenario has stopped.');
		const entry = { i: steps.length + 1, kind, title, status: 'running', t: seconds() };
		steps.push(entry);
		save();
		emit(`${kind} ${title}`);
		let value;
		let failed = false;
		try {
			value = typeof fn === 'function' ? await fn() : fn;
			if (value === false) throw new Error('The check returned false.');
		} catch (error) {
			failed = true;
			entry.error = message(error);
		}
		// After a stop, run_scenario.mjs owns the steps. A late result must not change them.
		if (stopped) throw new StepFailed('The scenario has stopped.');
		entry.status = failed ? 'failed' : 'passed';
		if (failed) emit(`${kind} failed: ${entry.error.split('\n')[0]}`);
		entry.duration = seconds() - entry.t;
		entry.shot = await shot(`${kind}-${String(entry.i).padStart(2, '0')}.png`);
		if (!stopped) save();
		if (failed && kind === 'step') throw new StepFailed(entry.error);
		return failed ? undefined : value;
	}

	async function api(method, path, body) {
		return await page.evaluate(
			async ({ method, path, body }) => {
				const res = await fetch(path, {
					method,
					headers: {
						'content-type': 'application/json',
						'browser-id': localStorage.getItem('n8n-browserId') ?? '',
					},
					body: body === undefined ? undefined : JSON.stringify(body),
				});
				const text = await res.text();
				if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
				const json = text ? JSON.parse(text) : null;
				return json && typeof json === 'object' && Object.keys(json).length === 1 && 'data' in json
					? json.data
					: json;
			},
			{ method, path, body },
		);
	}

	function currentThread() {
		return page.url().match(THREAD_URL)?.[1] ?? null;
	}

	function noteThread(id) {
		if (id && !threads.includes(id)) {
			threads.push(id);
			emit(`thread ${id}`);
		}
	}

	async function threadStatus(id) {
		const s = await api('GET', `/rest/instance-ai/threads/${id}/status`);
		const background = (s?.backgroundTasks ?? []).filter((x) => x.status === 'running').length;
		return { active: Boolean(s?.hasActiveRun), suspended: Boolean(s?.isSuspended), background };
	}

	const t = {
		page,
		ai,
		expect,
		baseUrl,
		threads,
		prompts,

		/** A step. When it throws, the scenario ends as failed. */
		step: (title, fn) => record('step', title, fn),
		/** A soft check. A failure is recorded and the scenario goes on. fn can return false to fail. */
		check: (title, fn) => record('check', title, fn),
		/** A line in the step list, with a screenshot. */
		note: (title) => record('note', title, () => true),

		/** Open a page of the instance. Default: the Assistant, with the composer ready. */
		async goto(path = '/assistant') {
			await page.goto(baseUrl + path, { waitUntil: 'domcontentloaded' });
			if (path.startsWith('/assistant')) {
				const enable = page.getByRole('dialog').filter({ hasText: 'Try new n8n Assistant' });
				if (await enable.isVisible({ timeout: 1500 }).catch(() => false)) {
					await enable
						.getByRole('button', { name: /Enable n8n Assistant on this instance/ })
						.click();
					await enable.getByRole('button', { name: /^(Continue|Enable)$/ }).click();
				}
				await expect(ai.chatInput()).toBeVisible({ timeout: 30_000 });
			}
			noteThread(currentThread());
		},

		/** Type a message in the composer and send it. Returns the thread id. */
		async send(text) {
			const before = await ai.assistantMessages().count();
			await expect(ai.chatInput()).toBeVisible({ timeout: 30_000 });
			await ai.chatInput().fill(text);
			await expect(ai.sendButton()).toBeEnabled({ timeout: 30_000 });
			await ai.sendButton().click();
			await page.waitForURL(THREAD_URL, { timeout: 30_000 });
			const id = currentThread();
			noteThread(id);
			prompts.push({
				t: seconds(),
				text,
				thread: id,
				assistantMessagesBefore: before,
				sentAt: Date.now(),
			});
			return id;
		},

		/**
		 * Wait until the thread has no active run, no open confirmation, and no running background task.
		 * Returns 'idle', or 'suspended' when a confirmation card waits for the scenario
		 * (autoConfirm is off, or the card stays open for 20 seconds).
		 */
		async waitForIdle({ timeout = 600_000, settle = 3000 } = {}) {
			const id = currentThread() ?? threads.at(-1);
			if (!id) throw new Error('No thread is open. Call t.send() first.');
			const last = prompts.filter((p) => p.thread === id).at(-1);
			const deadline = Date.now() + timeout;
			let seenRun = false;
			let idleSince = null;
			let suspendedSince = null;
			while (!stopped && Date.now() < deadline) {
				let s;
				try {
					s = await threadStatus(id);
				} catch {
					await page.waitForTimeout(1000);
					continue;
				}
				// The status can show no run for a moment after the message is sent. A run that the user
				// stops at once can end before it shows, so after a grace period "no run" means "done".
				if (!seenRun && Date.now() - (last?.sentAt ?? 0) > RUN_GRACE_MS) {
					seenRun = true;
				}
				if (!seenRun) {
					const replies = await ai
						.assistantMessages()
						.count()
						.catch(() => 0);
					seenRun =
						s.active ||
						s.suspended ||
						s.background > 0 ||
						replies > (last?.assistantMessagesBefore ?? 0);
				}
				if (s.suspended) {
					suspendedSince ??= Date.now();
					if (!autoConfirm || Date.now() - suspendedSince > 20_000) return 'suspended';
				} else {
					suspendedSince = null;
				}
				const idle = seenRun && !s.active && !s.suspended && s.background === 0;
				if (!idle) {
					idleSince = null;
				} else {
					idleSince ??= Date.now();
					if (Date.now() - idleSince >= settle) {
						await ai
							.sendButton()
							.waitFor({ state: 'visible', timeout: 10_000 })
							.catch(() => {});
						return 'idle';
					}
				}
				await page.waitForTimeout(1000);
			}
			throw new Error(`The thread did not go idle in ${Math.round(timeout / 1000)}s.`);
		},

		/**
		 * Save a screen for the visual check. Visual scenarios run on this branch and on master, and the
		 * report compares the screens with the same name. mask hides changing parts, such as LLM text.
		 * root is the part of the page for the accessibility tree diff (default: the whole page).
		 */
		async capture(name, { mask = [], maskText = [], root, fullPage = false } = {}) {
			if (!/^[a-z0-9][a-z0-9-]*$/.test(name))
				throw new Error(`Capture name "${name}": use a-z, 0-9 and "-".`);
			return await record('capture', `Capture ${name}`, async () => {
				await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
				await page.waitForTimeout(500);
				const texts = new Set(maskText.filter(Boolean));
				for (const locator of mask) {
					for (const inner of await locator.allInnerTexts().catch(() => [])) {
						for (const line of inner.split('\n'))
							if (line.trim().length > 1) texts.add(line.trim());
					}
				}
				const textMasks = maskText.filter(Boolean).map((s) => page.getByText(s, { exact: true }));
				await page.screenshot({
					path: join(out, 'captures', `${name}.png`),
					mask: [...mask, ...textMasks],
					maskColor: '#FF00FF',
					animations: 'disabled',
					caret: 'hide',
					fullPage,
				});
				const tree = await (root ?? page.locator('body'))
					.ariaSnapshot({ timeout: 10_000 })
					.catch((e) => `# ${message(e)}`);
				const subtrees = [];
				for (const locator of mask) {
					for (const element of await locator.all().catch(() => [])) {
						subtrees.push(await element.ariaSnapshot({ timeout: 5_000 }).catch(() => ''));
					}
				}
				writeFileSync(
					join(out, 'captures', `${name}.aria.yml`),
					maskTree(maskSubtrees(tree, subtrees), texts) + '\n',
				);
			});
		},

		/** A REST call as the signed-in user. Returns the `data` field of the answer when it has one. */
		api,
		threadStatus,
		sleep: (ms) => page.waitForTimeout(ms),
	};
	/** End the scenario: later steps throw, and a running step does not change the steps. */
	const stop = () => {
		stopped = true;
	};
	return { t, steps, threads, prompts, stop };
}
