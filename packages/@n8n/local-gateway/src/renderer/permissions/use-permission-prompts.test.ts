// Explicit vitest imports: the renderer tsconfig deliberately has `types: []`,
// so the vitest globals are not ambiently typed here.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import { __resetPermissionPromptsForTests, addPrompt } from './permission-prompt-store';
import { createPermissionPrompts } from './use-permission-prompts';
import { closeChat, openChat } from '../chat/chat-overlay';

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
});
