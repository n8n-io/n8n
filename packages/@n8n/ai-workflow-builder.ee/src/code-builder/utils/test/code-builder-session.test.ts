import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { FakeListChatModel } from '@langchain/core/utils/testing';
import { MemorySaver } from '@langchain/langgraph';

import { SessionManagerService } from '@/session-manager.service';

import {
	loadCodeBuilderSession,
	saveCodeBuilderSession,
	compactSessionIfNeeded,
	generateCodeBuilderThreadId,
	saveSessionMessages,
	type CodeBuilderSession,
} from '../code-builder-session';

// Mock structured output for the compact chain
class MockStructuredLLM extends FakeListChatModel {
	private readonly structuredResponse: Record<string, unknown>;

	constructor(response: Record<string, unknown>) {
		super({ responses: ['mock'] });
		this.structuredResponse = response;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	withStructuredOutput(): any {
		return {
			invoke: async () => this.structuredResponse,
		};
	}
}

describe('code-builder-session', () => {
	describe('loadCodeBuilderSession', () => {
		it('should return empty session for new thread', async () => {
			const checkpointer = new MemorySaver();
			const threadId = 'new-thread-123';

			const session = await loadCodeBuilderSession(checkpointer, threadId);

			expect(session).toEqual({ conversationEntries: [] });
		});

		it('should return existing session from checkpointer', async () => {
			const checkpointer = new MemorySaver();
			const threadId = 'existing-thread-123';

			// Save a session first
			await saveCodeBuilderSession(checkpointer, threadId, {
				conversationEntries: [
					{ type: 'build-request', message: 'message 1' },
					{ type: 'build-request', message: 'message 2' },
				],
				previousSummary: 'Test summary',
			});

			// Load it back
			const session = await loadCodeBuilderSession(checkpointer, threadId);

			expect(session.conversationEntries).toEqual([
				{ type: 'build-request', message: 'message 1' },
				{ type: 'build-request', message: 'message 2' },
			]);
			expect(session.previousSummary).toBe('Test summary');
		});

		it('should return empty session if checkpoint has no session data', async () => {
			const checkpointer = new MemorySaver();
			const threadId = 'empty-session-thread';

			// Save a checkpoint without session data (mimics a checkpoint from another system)
			const config = { configurable: { thread_id: threadId } };
			await checkpointer.put(
				config,
				{
					v: 1,
					id: 'test-id',
					ts: new Date().toISOString(),
					channel_values: { otherData: 'some value' },
					channel_versions: {},
					versions_seen: {},
				},
				{ source: 'update', step: -1, parents: {} },
			);

			const session = await loadCodeBuilderSession(checkpointer, threadId);

			expect(session).toEqual({ conversationEntries: [] });
		});

		it('should migrate legacy userMessages format on load', async () => {
			const checkpointer = new MemorySaver();
			const threadId = 'legacy-thread';

			const config = { configurable: { thread_id: threadId } };
			await checkpointer.put(
				config,
				{
					v: 1,
					id: 'legacy-id',
					ts: new Date().toISOString(),
					channel_values: {
						codeBuilderSession: {
							userMessages: ['old msg 1', 'old msg 2'],
							previousSummary: 'Old summary',
						},
					},
					channel_versions: {},
					versions_seen: {},
				},
				{ source: 'update', step: -1, parents: {} },
			);

			const session = await loadCodeBuilderSession(checkpointer, threadId);

			expect(session.conversationEntries).toEqual([
				{ type: 'build-request', message: 'old msg 1' },
				{ type: 'build-request', message: 'old msg 2' },
			]);
			expect(session.previousSummary).toBe('Old summary');
		});

		it('should preserve sdkSessionId on load', async () => {
			const checkpointer = new MemorySaver();
			const threadId = 'sdk-session-thread';

			await saveCodeBuilderSession(checkpointer, threadId, {
				conversationEntries: [{ type: 'build-request', message: 'test' }],
				sdkSessionId: 'sdk-123',
			});

			const session = await loadCodeBuilderSession(checkpointer, threadId);

			expect(session.sdkSessionId).toBe('sdk-123');
		});
	});

	describe('saveCodeBuilderSession', () => {
		it('should persist session to checkpointer', async () => {
			const checkpointer = new MemorySaver();
			const threadId = 'save-test-thread';

			const sessionToSave: CodeBuilderSession = {
				conversationEntries: [
					{ type: 'build-request', message: 'test message 1' },
					{ type: 'build-request', message: 'test message 2' },
				],
				previousSummary: 'A test summary',
			};

			await saveCodeBuilderSession(checkpointer, threadId, sessionToSave);

			// Verify it was saved by loading it back
			const loadedSession = await loadCodeBuilderSession(checkpointer, threadId);

			expect(loadedSession.conversationEntries).toEqual([
				{ type: 'build-request', message: 'test message 1' },
				{ type: 'build-request', message: 'test message 2' },
			]);
			expect(loadedSession.previousSummary).toBe('A test summary');
		});

		it('should update existing session', async () => {
			const checkpointer = new MemorySaver();
			const threadId = 'update-test-thread';

			// Save initial session
			await saveCodeBuilderSession(checkpointer, threadId, {
				conversationEntries: [{ type: 'build-request', message: 'initial message' }],
			});

			// Update session
			await saveCodeBuilderSession(checkpointer, threadId, {
				conversationEntries: [
					{ type: 'build-request', message: 'initial message' },
					{ type: 'build-request', message: 'new message' },
				],
				previousSummary: 'New summary',
			});

			const session = await loadCodeBuilderSession(checkpointer, threadId);

			expect(session.conversationEntries).toEqual([
				{ type: 'build-request', message: 'initial message' },
				{ type: 'build-request', message: 'new message' },
			]);
			expect(session.previousSummary).toBe('New summary');
		});

		it('should preserve other checkpoint data when updating', async () => {
			const checkpointer = new MemorySaver();
			const threadId = 'preserve-data-thread';

			// Save a checkpoint with other data
			const config = { configurable: { thread_id: threadId } };
			await checkpointer.put(
				config,
				{
					v: 1,
					id: 'original-id',
					ts: new Date().toISOString(),
					channel_values: { existingData: 'should be preserved' },
					channel_versions: {},
					versions_seen: {},
				},
				{ source: 'update', step: -1, parents: {} },
			);

			// Save session
			await saveCodeBuilderSession(checkpointer, threadId, {
				conversationEntries: [{ type: 'build-request', message: 'test' }],
			});

			// Verify both session and original data exist
			const tuple = await checkpointer.getTuple(config);
			expect(tuple?.checkpoint.channel_values?.existingData).toBe('should be preserved');
			expect(tuple?.checkpoint.channel_values?.codeBuilderSession).toEqual({
				conversationEntries: [{ type: 'build-request', message: 'test' }],
				previousSummary: undefined,
				sdkSessionId: undefined,
			});
		});
	});

	describe('compactSessionIfNeeded', () => {
		let fakeLLM: BaseChatModel;

		beforeEach(() => {
			fakeLLM = new MockStructuredLLM({
				summary: 'Compacted summary of old messages',
				key_decisions: ['Decision 1', 'Decision 2'],
				current_state: 'Current workflow state',
				next_steps: 'Next steps',
			});
		});

		it('should not compact when entries are below threshold', async () => {
			const session: CodeBuilderSession = {
				conversationEntries: [
					{ type: 'build-request', message: 'msg1' },
					{ type: 'build-request', message: 'msg2' },
					{ type: 'build-request', message: 'msg3' },
				],
			};

			const result = await compactSessionIfNeeded(session, fakeLLM, 20);

			// Should return the same session unchanged
			expect(result.conversationEntries).toHaveLength(3);
			expect(result.previousSummary).toBeUndefined();
		});

		it('should compact when entries exceed threshold', async () => {
			const entries = Array.from({ length: 21 }, (_, i) => ({
				type: 'build-request' as const,
				message: `message ${i + 1}`,
			}));
			const session: CodeBuilderSession = {
				conversationEntries: entries,
			};

			const result = await compactSessionIfNeeded(session, fakeLLM, 20);

			expect(result.conversationEntries.length).toBe(11);
			expect(result.conversationEntries[0]).toEqual({
				type: 'build-request',
				message: 'message 11',
			});
			expect(result.conversationEntries[10]).toEqual({
				type: 'build-request',
				message: 'message 21',
			});

			// Should have a summary
			expect(result.previousSummary).toContain('## Previous Conversation Summary');
		});

		it('should preserve most recent 11 entries when compacting 21', async () => {
			const entries = Array.from({ length: 21 }, (_, i) => ({
				type: 'build-request' as const,
				message: `msg-${i}`,
			}));
			const session: CodeBuilderSession = {
				conversationEntries: entries,
			};

			const result = await compactSessionIfNeeded(session, fakeLLM, 20);

			// Verifies that the 10 oldest are compacted and 11 newest remain
			expect(result.conversationEntries.map((e) => (e as { message: string }).message)).toEqual([
				'msg-10',
				'msg-11',
				'msg-12',
				'msg-13',
				'msg-14',
				'msg-15',
				'msg-16',
				'msg-17',
				'msg-18',
				'msg-19',
				'msg-20',
			]);
		});

		it('should append to existing summary when compacting', async () => {
			const entries = Array.from({ length: 21 }, (_, i) => ({
				type: 'build-request' as const,
				message: `message ${i + 1}`,
			}));
			const session: CodeBuilderSession = {
				conversationEntries: entries,
				previousSummary: 'Existing summary from earlier compaction',
			};

			const result = await compactSessionIfNeeded(session, fakeLLM, 20);

			// Should append the new summary to the existing one
			expect(result.previousSummary).toContain('Existing summary from earlier compaction');
			expect(result.previousSummary).toContain('---');
			expect(result.previousSummary).toContain('## Previous Conversation Summary');
		});

		it('should work with custom maxMessages threshold', async () => {
			const entries = ['msg1', 'msg2', 'msg3', 'msg4', 'msg5', 'msg6'].map((msg) => ({
				type: 'build-request' as const,
				message: msg,
			}));
			const session: CodeBuilderSession = {
				conversationEntries: entries,
			};

			// With max of 5, should compact when we have 6
			const result = await compactSessionIfNeeded(session, fakeLLM, 5);

			expect(result.conversationEntries.length).toBeLessThan(6);
			expect(result.previousSummary).toBeDefined();
		});

		it('should compact mixed entry types', async () => {
			const entries = [
				...Array.from({ length: 15 }, (_, i) => ({
					type: 'build-request' as const,
					message: `build ${i}`,
				})),
				...Array.from({ length: 5 }, (_, i) => ({
					type: 'assistant-exchange' as const,
					userQuery: `help ${i}`,
					assistantSummary: `answer ${i}`,
				})),
				{ type: 'plan' as const, userQuery: 'plan?', plan: 'Here is the plan' },
			];
			const session: CodeBuilderSession = {
				conversationEntries: entries,
			};

			const result = await compactSessionIfNeeded(session, fakeLLM, 20);

			expect(result.conversationEntries.length).toBe(11);
			expect(result.previousSummary).toBeDefined();
		});

		it('should preserve sdkSessionId through compaction', async () => {
			const entries = Array.from({ length: 21 }, (_, i) => ({
				type: 'build-request' as const,
				message: `msg ${i}`,
			}));
			const session: CodeBuilderSession = {
				conversationEntries: entries,
				sdkSessionId: 'sdk-keep-me',
			};

			const result = await compactSessionIfNeeded(session, fakeLLM, 20);

			expect(result.sdkSessionId).toBe('sdk-keep-me');
		});
	});

	describe('generateCodeBuilderThreadId', () => {
		it('should generate consistent thread ID from workflow and user', () => {
			const threadId1 = generateCodeBuilderThreadId('workflow-123', 'user-456');
			const threadId2 = generateCodeBuilderThreadId('workflow-123', 'user-456');

			expect(threadId1).toBe(threadId2);
			expect(threadId1).toBe('code-builder-workflow-123-user-456');
		});

		it('should generate different IDs for different workflows', () => {
			const threadId1 = generateCodeBuilderThreadId('workflow-A', 'user-1');
			const threadId2 = generateCodeBuilderThreadId('workflow-B', 'user-1');

			expect(threadId1).not.toBe(threadId2);
		});

		it('should generate different IDs for different users', () => {
			const threadId1 = generateCodeBuilderThreadId('workflow-A', 'user-1');
			const threadId2 = generateCodeBuilderThreadId('workflow-A', 'user-2');

			expect(threadId1).not.toBe(threadId2);
		});
	});

	describe('saveSessionMessages', () => {
		it('should create new checkpoint with provided messages', async () => {
			const checkpointer = new MemorySaver();
			const workflowId = 'workflow-123';
			const userId = 'user-456';

			const messages = [
				new HumanMessage('Create a workflow that sends email'),
				new AIMessage('I have created the workflow.'),
			];

			await saveSessionMessages(checkpointer, workflowId, userId, messages);

			// Verify by reading from the SessionManager thread format
			const threadId = SessionManagerService.generateThreadId(workflowId, userId, 'code-builder');
			const config = { configurable: { thread_id: threadId } };
			const tuple = await checkpointer.getTuple(config);

			expect(tuple).toBeDefined();
			expect(tuple?.checkpoint.channel_values?.messages).toBeDefined();

			const savedMessages = tuple?.checkpoint.channel_values?.messages as Array<
				HumanMessage | AIMessage
			>;
			expect(savedMessages).toHaveLength(2);

			// Check HumanMessage has messageId added
			expect(savedMessages[0]).toBeInstanceOf(HumanMessage);
			expect(savedMessages[0].content).toBe('Create a workflow that sends email');
			expect(savedMessages[0].additional_kwargs?.messageId).toBeDefined();

			// Check AIMessage
			expect(savedMessages[1]).toBeInstanceOf(AIMessage);
			expect(savedMessages[1].content).toBe('I have created the workflow.');
		});

		it('should store versionId in first HumanMessage additional_kwargs', async () => {
			const checkpointer = new MemorySaver();
			const workflowId = 'workflow-123';
			const userId = 'user-456';
			const versionId = 'version-abc';

			const messages = [new HumanMessage('Test message'), new AIMessage('Response')];

			await saveSessionMessages(checkpointer, workflowId, userId, messages, versionId);

			const threadId = SessionManagerService.generateThreadId(workflowId, userId, 'code-builder');
			const config = { configurable: { thread_id: threadId } };
			const tuple = await checkpointer.getTuple(config);

			const savedMessages = tuple?.checkpoint.channel_values?.messages as Array<
				HumanMessage | AIMessage
			>;
			expect(savedMessages[0].additional_kwargs?.versionId).toBe(versionId);
		});

		it('should append to existing messages array', async () => {
			const checkpointer = new MemorySaver();
			const workflowId = 'workflow-123';
			const userId = 'user-456';

			// First turn
			const firstMessages = [new HumanMessage('First message'), new AIMessage('First response')];
			await saveSessionMessages(checkpointer, workflowId, userId, firstMessages);

			// Second turn
			const secondMessages = [new HumanMessage('Second message'), new AIMessage('Second response')];
			await saveSessionMessages(checkpointer, workflowId, userId, secondMessages);

			const threadId = SessionManagerService.generateThreadId(workflowId, userId, 'code-builder');
			const config = { configurable: { thread_id: threadId } };
			const tuple = await checkpointer.getTuple(config);

			const savedMessages = tuple?.checkpoint.channel_values?.messages as Array<
				HumanMessage | AIMessage
			>;
			expect(savedMessages).toHaveLength(4); // 2 messages from each turn

			expect(savedMessages[0].content).toBe('First message');
			expect(savedMessages[1].content).toBe('First response');
			expect(savedMessages[2].content).toBe('Second message');
			expect(savedMessages[3].content).toBe('Second response');
		});

		it('should work with HumanMessage only', async () => {
			const checkpointer = new MemorySaver();
			const workflowId = 'workflow-123';
			const userId = 'user-456';

			const messages = [new HumanMessage('User message only')];

			await saveSessionMessages(checkpointer, workflowId, userId, messages);

			const threadId = SessionManagerService.generateThreadId(workflowId, userId, 'code-builder');
			const config = { configurable: { thread_id: threadId } };
			const tuple = await checkpointer.getTuple(config);

			const savedMessages = tuple?.checkpoint.channel_values?.messages as Array<
				HumanMessage | AIMessage
			>;
			expect(savedMessages).toHaveLength(1);
			expect(savedMessages[0]).toBeInstanceOf(HumanMessage);
		});

		it('should use code-builder thread format with -code suffix', async () => {
			const checkpointer = new MemorySaver();
			const workflowId = 'wf-test';
			const userId = 'user-test';

			const messages = [new HumanMessage('Test'), new AIMessage('Response')];

			await saveSessionMessages(checkpointer, workflowId, userId, messages);

			// Verify thread ID uses code-builder format with -code suffix
			const expectedThreadId = `workflow-${workflowId}-user-${userId}-code`;
			const config = { configurable: { thread_id: expectedThreadId } };
			const tuple = await checkpointer.getTuple(config);

			expect(tuple).toBeDefined();
			expect(tuple?.checkpoint.channel_values?.messages).toBeDefined();

			// Verify the old format without -code suffix does NOT have the messages
			const oldThreadId = `workflow-${workflowId}-user-${userId}`;
			const oldConfig = { configurable: { thread_id: oldThreadId } };
			const oldTuple = await checkpointer.getTuple(oldConfig);

			expect(oldTuple).toBeUndefined();
		});

		it('should add messageId to first HumanMessage even when SystemMessage is at index 0', async () => {
			const checkpointer = new MemorySaver();
			const workflowId = 'workflow-123';
			const userId = 'user-456';

			// Code-builder messages start with SystemMessage, not HumanMessage
			const messages = [
				new SystemMessage('You are a workflow builder assistant.'),
				new HumanMessage('Create a workflow that sends email'),
				new AIMessage('I have created the workflow.'),
			];

			await saveSessionMessages(checkpointer, workflowId, userId, messages);

			const threadId = SessionManagerService.generateThreadId(workflowId, userId, 'code-builder');
			const config = { configurable: { thread_id: threadId } };
			const tuple = await checkpointer.getTuple(config);

			const savedMessages = tuple?.checkpoint.channel_values?.messages as Array<
				SystemMessage | HumanMessage | AIMessage
			>;
			expect(savedMessages).toHaveLength(3);

			// SystemMessage should NOT have messageId
			expect(savedMessages[0]).toBeInstanceOf(SystemMessage);
			expect(savedMessages[0].additional_kwargs?.messageId).toBeUndefined();

			// First HumanMessage should have messageId even though it's at index 1
			expect(savedMessages[1]).toBeInstanceOf(HumanMessage);
			expect(savedMessages[1].additional_kwargs?.messageId).toBeDefined();

			// AIMessage should NOT have messageId
			expect(savedMessages[2]).toBeInstanceOf(AIMessage);
			expect(savedMessages[2].additional_kwargs?.messageId).toBeUndefined();
		});

		it('should add messageId to first HumanMessage in each follow-up turn', async () => {
			const checkpointer = new MemorySaver();
			const workflowId = 'workflow-123';
			const userId = 'user-456';

			// First turn - with SystemMessage
			const firstMessages = [
				new SystemMessage('System prompt'),
				new HumanMessage('First request'),
				new AIMessage('First response'),
			];
			await saveSessionMessages(checkpointer, workflowId, userId, firstMessages);

			// Second turn - follow-up with SystemMessage
			const secondMessages = [
				new SystemMessage('System prompt'),
				new HumanMessage('Follow-up request'),
				new AIMessage('Follow-up response'),
			];
			await saveSessionMessages(checkpointer, workflowId, userId, secondMessages);

			const threadId = SessionManagerService.generateThreadId(workflowId, userId, 'code-builder');
			const config = { configurable: { thread_id: threadId } };
			const tuple = await checkpointer.getTuple(config);

			const savedMessages = tuple?.checkpoint.channel_values?.messages as Array<
				SystemMessage | HumanMessage | AIMessage
			>;
			expect(savedMessages).toHaveLength(6); // 3 from each turn

			// First turn's HumanMessage (index 1) should have messageId
			expect(savedMessages[1]).toBeInstanceOf(HumanMessage);
			expect(savedMessages[1].additional_kwargs?.messageId).toBeDefined();
			const firstMessageId = savedMessages[1].additional_kwargs?.messageId;

			// Second turn's HumanMessage (index 4) should have a DIFFERENT messageId
			expect(savedMessages[4]).toBeInstanceOf(HumanMessage);
			expect(savedMessages[4].additional_kwargs?.messageId).toBeDefined();
			const secondMessageId = savedMessages[4].additional_kwargs?.messageId;

			// Each turn should have unique messageId
			expect(firstMessageId).not.toBe(secondMessageId);
		});

		it('should use provided userMessageId instead of generating a random one', async () => {
			const checkpointer = new MemorySaver();
			const workflowId = 'workflow-123';
			const userId = 'user-456';

			const messages = [new HumanMessage('Create a workflow'), new AIMessage('Done')];

			await saveSessionMessages(
				checkpointer,
				workflowId,
				userId,
				messages,
				undefined, // versionId
				'frontend-id-123', // userMessageId
			);

			const threadId = SessionManagerService.generateThreadId(workflowId, userId, 'code-builder');
			const config = { configurable: { thread_id: threadId } };
			const tuple = await checkpointer.getTuple(config);

			const savedMessages = tuple?.checkpoint.channel_values?.messages as Array<
				HumanMessage | AIMessage
			>;
			expect(savedMessages[0].additional_kwargs?.messageId).toBe('frontend-id-123');
		});

		it('should add versionId to first HumanMessage when SystemMessage is at index 0', async () => {
			const checkpointer = new MemorySaver();
			const workflowId = 'workflow-123';
			const userId = 'user-456';
			const versionId = 'version-abc';

			const messages = [
				new SystemMessage('System prompt'),
				new HumanMessage('Create workflow'),
				new AIMessage('Done'),
			];

			await saveSessionMessages(checkpointer, workflowId, userId, messages, versionId);

			const threadId = SessionManagerService.generateThreadId(workflowId, userId, 'code-builder');
			const config = { configurable: { thread_id: threadId } };
			const tuple = await checkpointer.getTuple(config);

			const savedMessages = tuple?.checkpoint.channel_values?.messages as Array<
				SystemMessage | HumanMessage | AIMessage
			>;

			// versionId should be on the HumanMessage, not SystemMessage
			expect(savedMessages[0].additional_kwargs?.versionId).toBeUndefined();
			expect(savedMessages[1].additional_kwargs?.versionId).toBe(versionId);
		});
	});
});
