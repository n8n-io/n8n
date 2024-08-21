import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import {
	DEFAULT_CHAT_WIDTH,
	MAX_CHAT_WIDTH,
	MIN_CHAT_WIDTH,
	useAssistantStore,
} from '@/stores/assistant.store';
import type { ChatRequest } from '@/types/assistant.types';
import { usePostHog } from '../posthog.store';
import { useSettingsStore } from '@/stores/settings.store';
// import { useUsersStore } from '@/stores/users.store';
// import { useWorkflowsStore } from '@/stores/workflows.store';
// import { useNDVStore } from '@/stores/ndv.store';

let settingsStore: ReturnType<typeof useSettingsStore>;
// let usersStore: ReturnType<typeof useUsersStore>;
// let workflowsStore: ReturnType<typeof useWorkflowsStore>;
// let ndvStore: ReturnType<typeof useNDVStore>;
let posthogStore: ReturnType<typeof usePostHog>;

describe('AI Assistant store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		settingsStore = useSettingsStore();
		// usersStore = useUsersStore();
		// workflowsStore = useWorkflowsStore();
		// ndvStore = useNDVStore();
		posthogStore = usePostHog();
	});

	it('initializes with default values', () => {
		const assistantStore = useAssistantStore();

		expect(assistantStore.chatWidth).toBe(DEFAULT_CHAT_WIDTH);
		expect(assistantStore.chatMessages).toEqual([]);
		expect(assistantStore.chatWindowOpen).toBe(false);
		expect(assistantStore.streaming).toBeUndefined();
	});

	it('can change chat width', () => {
		const assistantStore = useAssistantStore();

		assistantStore.updateWindowWidth(400);
		expect(assistantStore.chatWidth).toBe(400);
	});

	it('should not allow chat width to be less than the minimal width', () => {
		const assistantStore = useAssistantStore();

		assistantStore.updateWindowWidth(100);
		expect(assistantStore.chatWidth).toBe(MIN_CHAT_WIDTH);
	});

	it('should not allow chat width to be more than the maximal width', () => {
		const assistantStore = useAssistantStore();

		assistantStore.updateWindowWidth(2000);
		expect(assistantStore.chatWidth).toBe(MAX_CHAT_WIDTH);
	});

	it('should open chat window', () => {
		const assistantStore = useAssistantStore();

		assistantStore.openChat();
		expect(assistantStore.chatWindowOpen).toBe(true);
	});

	it('should close chat window', () => {
		const assistantStore = useAssistantStore();

		assistantStore.closeChat();
		expect(assistantStore.chatWindowOpen).toBe(false);
	});

	it('can add a simple assistant message', () => {
		const assistantStore = useAssistantStore();

		const message: ChatRequest.MessageResponse = {
			type: 'message',
			role: 'assistant',
			text: 'Hello!',
		};
		assistantStore.addAssistantMessages([message], '1');
		expect(assistantStore.chatMessages.length).toBe(1);
		expect(assistantStore.chatMessages[0]).toEqual({
			id: '1',
			type: 'text',
			role: 'assistant',
			content: 'Hello!',
			quickReplies: undefined,
			read: false,
		});
	});

	it('can add an assistant message with quick replies', () => {
		const assistantStore = useAssistantStore();

		const message: ChatRequest.MessageResponse = {
			type: 'message',
			role: 'assistant',
			text: 'Hello!',
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		};
		assistantStore.addAssistantMessages([message], '1');
		expect(assistantStore.chatMessages.length).toBe(1);
		expect(assistantStore.chatMessages[0]).toEqual({
			id: '1',
			type: 'text',
			role: 'assistant',
			content: 'Hello!',
			read: false,
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		});
	});

	it('can add an assistant code-diff message', () => {
		const assistantStore = useAssistantStore();

		const message: ChatRequest.MessageResponse = {
			type: 'code-diff',
			role: 'assistant',
			description: 'Here is the suggested code change',
			codeDiff: 'diff --git a/file1 b/file2',
			suggestionId: '1',
			solution_count: 1,
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		};
		assistantStore.addAssistantMessages([message], '1');
		expect(assistantStore.chatMessages.length).toBe(1);
		expect(assistantStore.chatMessages[0]).toEqual({
			id: '1',
			type: 'code-diff',
			role: 'assistant',
			description: 'Here is the suggested code change',
			codeDiff: 'diff --git a/file1 b/file2',
			suggestionId: '1',
			read: false,
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		});
	});

	it('can add an assistant summary message', () => {
		const assistantStore = useAssistantStore();

		const message: ChatRequest.MessageResponse = {
			type: 'summary',
			role: 'assistant',
			title: 'Summary',
			content: 'Here is the summary',
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		};
		assistantStore.addAssistantMessages([message], '1');
		expect(assistantStore.chatMessages.length).toBe(1);
		expect(assistantStore.chatMessages[0]).toEqual({
			id: '1',
			type: 'block',
			role: 'assistant',
			title: 'Summary',
			content: 'Here is the summary',
			read: false,
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		});
	});

	it('can add an agent suggestion message', () => {
		const assistantStore = useAssistantStore();

		const message: ChatRequest.MessageResponse = {
			type: 'agent-suggestion',
			role: 'assistant',
			title: 'A Suggestion',
			text: 'Here is a suggestion',
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		};
		assistantStore.addAssistantMessages([message], '1');
		expect(assistantStore.chatMessages.length).toBe(1);
		expect(assistantStore.chatMessages[0]).toEqual({
			id: '1',
			type: 'block',
			role: 'assistant',
			title: 'A Suggestion',
			content: 'Here is a suggestion',
			read: false,
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		});
	});

	it('should reset assistant chat session', () => {
		const assistantStore = useAssistantStore();

		const message: ChatRequest.MessageResponse = {
			type: 'message',
			role: 'assistant',
			text: 'Hello!',
			quickReplies: [
				{ text: 'Yes', type: 'text' },
				{ text: 'No', type: 'text' },
			],
		};
		assistantStore.addAssistantMessages([message], '1');
		expect(assistantStore.chatMessages.length).toBe(1);

		assistantStore.resetAssistantChat();
		expect(assistantStore.chatMessages).toEqual([]);
		expect(assistantStore.currentSessionId).toBeUndefined();
	});

	it('should disable assistant for control experiment group', () => {
		const assistantStore = useAssistantStore();

		posthogStore.getVariant = vi.fn().mockReturnValue('control');
		// TODO: Mock isAssistantEnabled and route
		expect(assistantStore.canShowAssistant).toBe(false);
	});

	// TODO: To test:
	// - canShowAssistant
	// - canShowAssistantButtons
	// - initErrorHelper
	// - sendMessage
	// - applyCodeDiff
	// - undoCodeDiff
});
