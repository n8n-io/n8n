import type { ExecutionRepository, IExecutionResponse } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import type { INodeType, IVersionedNodeType, LoadedClass, NodeLoadingDetails } from 'n8n-workflow';
import { CHAT_NODE_TYPE, CHAT_TOOL_NODE_TYPE, RESPOND_TO_WEBHOOK_NODE_TYPE } from 'n8n-workflow';

import type { ExecutionPersistence } from '@/executions/execution-persistence';

import { NodeTypes } from '../../node-types';
import { ChatExecutionManager } from '../chat-execution-manager';
import type { ChatMessage } from '../chat-service.types';

/**
 * Guards the security-critical fact the `/chat` resume allowlist depends on:
 * *which real node types implement the `onMessage` hook*. The unit tests stub
 * `getByNameAndVersion`, so they can't catch a registry change (e.g. a non-chat
 * node gaining `onMessage`, or the chat tool suffix chain breaking). This test
 * resolves the actual node classes from dist through the real `NodeTypes`
 * registry — including the synthetic `*HitlTool` variants — and asserts both the
 * `onMessage` inventory and the resulting `canResumeOverChat` decision.
 */

const TELEGRAM = 'n8n-nodes-base.telegram';
const WAIT = 'n8n-nodes-base.wait';
const TELEGRAM_HITL = 'n8n-nodes-base.telegramHitlTool';
const CHAT_HITL = '@n8n/n8n-nodes-langchain.chatHitlTool';

/** Loads a real node class from a built package's dist using its known-nodes manifest. */
function loadRealNode(fullType: string): LoadedClass<INodeType | IVersionedNodeType> {
	const [pkg, shortName] = fullType.startsWith('@n8n/')
		? ['@n8n/n8n-nodes-langchain', fullType.replace('@n8n/n8n-nodes-langchain.', '')]
		: ['n8n-nodes-base', fullType.replace('n8n-nodes-base.', '')];

	const pkgRoot = path.dirname(require.resolve(`${pkg}/package.json`));
	const known = JSON.parse(
		readFileSync(path.join(pkgRoot, 'dist/known/nodes.json'), 'utf-8'),
	) as Record<string, NodeLoadingDetails>;

	const info = known[shortName];
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const mod = require(path.join(pkgRoot, info.sourcePath));
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const type = new mod[info.className]();
	return { type, sourcePath: '' };
}

/** Real NodeTypes backed by a thin loader over dist-loaded base nodes, so
 * `getByNameAndVersion` runs its actual tool-suffix resolution + synthesis. */
function makeRealNodeTypes(): NodeTypes {
	const baseTypes: Record<string, LoadedClass<INodeType | IVersionedNodeType>> = {
		[CHAT_NODE_TYPE]: loadRealNode(CHAT_NODE_TYPE),
		[RESPOND_TO_WEBHOOK_NODE_TYPE]: loadRealNode(RESPOND_TO_WEBHOOK_NODE_TYPE),
		[TELEGRAM]: loadRealNode(TELEGRAM),
		[WAIT]: loadRealNode(WAIT),
	};

	const loader = {
		recognizesNode: (name: string) => name in baseTypes,
		getNode: (name: string) => baseTypes[name],
		loadedNodes: {} as Record<string, LoadedClass<INodeType>>,
	};

	return new NodeTypes(mock(), loader as never);
}

function makeExecution(nodeType: string, parameters: Record<string, unknown> = {}) {
	const node = { name: 'parked', type: nodeType, typeVersion: 1, parameters };
	return {
		id: '1',
		workflowData: { id: 'wf', nodes: [node], connections: {} },
		data: {
			resultData: { lastNodeExecuted: 'parked', runData: {} },
			executionData: { nodeExecutionStack: [{ node, data: { main: [[]] } }] },
		},
	} as unknown as IExecutionResponse;
}

describe('chat resume — real node-type onMessage mapping', () => {
	let nodeTypes: NodeTypes;
	let manager: ChatExecutionManager;
	let executionRepository: ReturnType<typeof mock<ExecutionRepository>>;
	let executionPersistence: ReturnType<typeof mock<ExecutionPersistence>>;

	beforeAll(() => {
		nodeTypes = makeRealNodeTypes();
		executionRepository = mock<ExecutionRepository>();
		executionPersistence = mock<ExecutionPersistence>();
		manager = new ChatExecutionManager(
			executionRepository,
			executionPersistence,
			mock(),
			mock(),
			nodeTypes,
		);
	});

	describe('onMessage inventory (resolved through the real registry)', () => {
		it.each([
			[CHAT_NODE_TYPE, true],
			[RESPOND_TO_WEBHOOK_NODE_TYPE, true],
			[CHAT_HITL, true], // synthetic tool inherits onMessage from the base Chat node
			[TELEGRAM, false],
			[WAIT, false],
			[TELEGRAM_HITL, false], // synthetic tool of a base node that has no onMessage
		])('%s implements onMessage: %s', (type, expected) => {
			const resolved = nodeTypes.getByNameAndVersion(type);
			expect(typeof resolved.onMessage === 'function').toBe(expected);
		});
	});

	describe('canResumeOverChat against real node types', () => {
		it('allows the Chat node', () => {
			expect(manager.canResumeOverChat(makeExecution(CHAT_NODE_TYPE))).toBe(true);
		});

		it('allows a chat-based HITL tool', () => {
			expect(manager.canResumeOverChat(makeExecution(CHAT_HITL))).toBe(true);
		});

		it('refuses a Telegram Send-and-Wait gate', () => {
			expect(manager.canResumeOverChat(makeExecution(TELEGRAM, { operation: 'sendAndWait' }))).toBe(
				false,
			);
		});

		it('refuses a non-chat HITL tool (telegramHitlTool)', () => {
			expect(manager.canResumeOverChat(makeExecution(TELEGRAM_HITL))).toBe(false);
		});

		it('refuses a plain Wait node', () => {
			expect(manager.canResumeOverChat(makeExecution(WAIT, { resume: 'timeInterval' }))).toBe(
				false,
			);
		});

		it('refuses a chat node that opted out of user input', () => {
			// blockUserInput only applies (and survives Workflow parameter resolution)
			// when responseType is 'approval' — mirror a real approval chat node.
			expect(
				manager.canResumeOverChat(
					makeExecution(CHAT_NODE_TYPE, { responseType: 'approval', blockUserInput: true }),
				),
			).toBe(false);
		});

		it('refuses a chat-based HITL tool that opted out of user input', () => {
			expect(
				manager.canResumeOverChat(
					makeExecution(CHAT_HITL, { responseType: 'approval', blockUserInput: true }),
				),
			).toBe(false);
		});
	});

	describe('cancelExecution heartbeat gate against real node types', () => {
		function waitingExecution(nodeType: string, parameters: Record<string, unknown> = {}) {
			const execution = makeExecution(nodeType, parameters);
			(execution as unknown as { status: string }).status = 'waiting';
			return execution;
		}

		beforeEach(() => {
			executionRepository.update.mockClear();
		});

		it('cancels an abandoned chat execution', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue(waitingExecution(CHAT_NODE_TYPE));

			await manager.cancelExecution('1');

			expect(executionRepository.update).toHaveBeenCalledWith({ id: '1' }, { status: 'canceled' });
		});

		it('does not cancel a Telegram Send-and-Wait execution the socket does not drive', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue(
				waitingExecution(TELEGRAM, { operation: 'sendAndWait' }),
			);

			await manager.cancelExecution('1');

			expect(executionRepository.update).not.toHaveBeenCalled();
		});

		it('does not cancel a plain Wait execution the socket does not drive', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue(
				waitingExecution(WAIT, { resume: 'timeInterval' }),
			);

			await manager.cancelExecution('1');

			expect(executionRepository.update).not.toHaveBeenCalled();
		});
	});

	describe('runWorkflow sink guard against real node types', () => {
		const message: ChatMessage = { sessionId: 's', action: 'sendMessage', chatInput: 'x' };

		it('refuses to resume a Telegram Send-and-Wait gate', async () => {
			await expect(
				manager.runWorkflow(makeExecution(TELEGRAM, { operation: 'sendAndWait' }), message),
			).rejects.toThrow('Refusing to resume a non-chat node over chat');
		});

		it('refuses to resume a plain Wait node', async () => {
			await expect(
				manager.runWorkflow(makeExecution(WAIT, { resume: 'timeInterval' }), message),
			).rejects.toThrow('Refusing to resume a non-chat node over chat');
		});
	});

	it('keeps CHAT_TOOL_NODE_TYPE resolvable to an onMessage-bearing type', () => {
		// chatTool resolves to the base Chat node, so it must also carry onMessage.
		expect(typeof nodeTypes.getByNameAndVersion(CHAT_TOOL_NODE_TYPE).onMessage).toBe('function');
	});
});
