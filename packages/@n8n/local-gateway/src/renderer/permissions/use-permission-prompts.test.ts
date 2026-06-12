// Explicit vitest imports: the renderer tsconfig deliberately has `types: []`,
// so the vitest globals are not ambiently typed here.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import {
	__resetPermissionPromptsForTests,
	addPrompt,
	removePrompt,
} from './permission-prompt-store';
import type { InstancePermissionPrompt } from './prompt-classification';
import { createPermissionPrompts } from './use-permission-prompts';
import { chatOverlay, closeChat, openChat } from '../chat/chat-overlay';
import { markChatThreadVisible } from '../chat/visible-chat-threads';

function externalPrompt(
	overrides: Partial<InstancePermissionPrompt> = {},
): InstancePermissionPrompt {
	return {
		id: 'instance:r1',
		source: 'instance',
		kind: 'external',
		threadId: 't-ext',
		requestId: 'r1',
		toolCallId: 'tc1',
		severity: 'info',
		message: 'Which folder do you mean?',
		...overrides,
	};
}

function stubElectronApi() {
	const api = {
		listPermissionPrompts: vi.fn(async () => await Promise.resolve([])),
		onPermissionPromptRequested: vi.fn(() => () => {}),
		onPermissionPromptWithdrawn: vi.fn(() => () => {}),
	};
	(globalThis as unknown as { window: { electronAPI: typeof api } }).window = { electronAPI: api };
	return api;
}

function makeWatcher() {
	const releases = new Map<string, ReturnType<typeof vi.fn>>();
	return {
		releases,
		watchThread: vi.fn((threadId: string) => {
			const release = vi.fn();
			releases.set(threadId, release);
			return release;
		}),
	};
}

describe('createPermissionPrompts', () => {
	beforeEach(() => {
		__resetPermissionPromptsForTests();
		closeChat();
		stubElectronApi();
	});

	it('watches the chat thread while open and releases it on close', async () => {
		const watcher = makeWatcher();
		createPermissionPrompts(watcher, () => {});

		openChat('t1');
		await nextTick();
		expect(watcher.watchThread).toHaveBeenCalledWith('t1');

		closeChat();
		await nextTick();
		expect(watcher.releases.get('t1')).toHaveBeenCalledTimes(1);
	});

	it('switching chat threads releases the previous watch', async () => {
		const watcher = makeWatcher();
		createPermissionPrompts(watcher, () => {});

		openChat('t1');
		await nextTick();
		openChat('t2');
		await nextTick();

		expect(watcher.releases.get('t1')).toHaveBeenCalledTimes(1);
		expect(watcher.releases.get('t2')).not.toHaveBeenCalled();
	});

	it('the registered cleanup releases the active watch and stops following the overlay', async () => {
		const watcher = makeWatcher();
		let cleanup: (() => void) | undefined;
		createPermissionPrompts(watcher, (registered) => {
			cleanup = registered;
		});

		openChat('t1');
		await nextTick();
		cleanup?.();
		expect(watcher.releases.get('t1')).toHaveBeenCalledTimes(1);

		openChat('t2');
		await nextTick();
		expect(watcher.watchThread).toHaveBeenCalledTimes(1);
	});

	it('exposes the store prompts oldest-first and connects the local source', () => {
		const watcher = makeWatcher();
		const api = stubElectronApi();
		const { prompts } = createPermissionPrompts(watcher, () => {});

		expect(api.onPermissionPromptRequested).toHaveBeenCalledTimes(1);

		addPrompt({
			id: 'local:p1',
			source: 'local',
			kind: 'resourceDecision',
			localId: 'p1',
			severity: 'warning',
			message: 'Write file',
			resourceDecision: { resource: '/tmp/ok.txt', description: 'Write file', options: [] },
		});

		expect(prompts.value.map((prompt) => prompt.id)).toEqual(['local:p1']);
	});

	it('opens the chat for the thread of a new external prompt', async () => {
		createPermissionPrompts(makeWatcher(), () => {});

		addPrompt(externalPrompt());
		await nextTick();

		expect(chatOverlay.isOpen).toBe(true);
		expect(chatOverlay.threadId).toBe('t-ext');
	});

	it('opens the chat for an external prompt only once, so closing it is not fought', async () => {
		createPermissionPrompts(makeWatcher(), () => {});

		addPrompt(externalPrompt());
		await nextTick();
		closeChat();
		removePrompt('instance:r1');
		await nextTick();

		addPrompt(externalPrompt());
		await nextTick();

		expect(chatOverlay.isOpen).toBe(false);
	});

	it('does not disturb a chat already open on the external prompt thread', async () => {
		createPermissionPrompts(makeWatcher(), () => {});

		openChat('t-ext', { title: 'My task' });
		addPrompt(externalPrompt());
		await nextTick();

		expect(chatOverlay.title).toBe('My task');
	});

	it('does not open the chat for non-external prompts', async () => {
		createPermissionPrompts(makeWatcher(), () => {});

		addPrompt(externalPrompt({ kind: 'approval' }));
		await nextTick();

		expect(chatOverlay.isOpen).toBe(false);
	});

	it('hides external prompts of a visible chat thread from the card stack and skips auto-open', async () => {
		const { prompts } = createPermissionPrompts(makeWatcher(), () => {});
		const release = markChatThreadVisible('t-ext');

		addPrompt(externalPrompt());
		addPrompt(externalPrompt({ id: 'instance:r2', requestId: 'r2', kind: 'approval' }));
		await nextTick();

		// The transcript renders the external prompt; approval cards still float.
		expect(prompts.value.map((prompt) => prompt.id)).toEqual(['instance:r2']);
		expect(chatOverlay.isOpen).toBe(false);

		release();
		expect(prompts.value.map((prompt) => prompt.id)).toEqual(['instance:r1', 'instance:r2']);
	});
});
