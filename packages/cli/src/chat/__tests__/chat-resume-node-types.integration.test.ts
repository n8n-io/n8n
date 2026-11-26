import type { ExecutionRepository, IExecutionResponse } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type * as fs from 'node:fs';
import path from 'node:path';
import type { INodeType, IVersionedNodeType, LoadedClass, NodeLoadingDetails } from 'n8n-workflow';
import { RESPOND_TO_CHAT_NODE_TYPE, RESPOND_TO_WEBHOOK_NODE_TYPE } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '../../load-nodes-and-credentials';
import { NodeTypes } from '../../node-types';
import { ChatExecutionManager } from '../chat-execution-manager';

/**
 * Guards the security-critical fact the `/chat` resume allowlist depends on:
 * *which real node types implement the `onMessage` hook*. The unit tests stub
 * `getByNameAndVersion`, so they can't catch a registry change (e.g. a non-chat
 * node gaining `onMessage`, or the chat tool resolution breaking). This test
 * resolves the actual node classes from dist through the real `NodeTypes`
 * registry and asserts both the `onMessage` inventory and the resulting
 * `canResumeOverChat` decision.
 */

const CHAT_TOOL = '@n8n/n8n-nodes-langchain.chatTool';
const TELEGRAM = 'n8n-nodes-base.telegram';
const WAIT = 'n8n-nodes-base.wait';

// The cli test setup mocks `node:fs`; this test reads real built manifests.
const { readFileSync } = jest.requireActual<typeof fs>('node:fs');

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
		[RESPOND_TO_CHAT_NODE_TYPE]: loadRealNode(RESPOND_TO_CHAT_NODE_TYPE),
		[RESPOND_TO_WEBHOOK_NODE_TYPE]: loadRealNode(RESPOND_TO_WEBHOOK_NODE_TYPE),
		[TELEGRAM]: loadRealNode(TELEGRAM),
		[WAIT]: loadRealNode(WAIT),
	};

	const loader = {
		recognizesNode: (name: string) => name in baseTypes,
		getNode: (name: string) => baseTypes[name],
		loadedNodes: {} as Record<string, LoadedClass<INodeType>>,
		// Borrow the real tool conversion, so the synthetic chatTool matches production.
		convertNodeToAiTool: LoadNodesAndCredentials.prototype.convertNodeToAiTool,
		findLastCalloutIndex: (
			LoadNodesAndCredentials.prototype as unknown as { findLastCalloutIndex: unknown }
		).findLastCalloutIndex,
	};

	return new NodeTypes(loader as never);
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

	beforeAll(() => {
		nodeTypes = makeRealNodeTypes();
		executionRepository = mock<ExecutionRepository>();
		manager = new ChatExecutionManager(executionRepository, mock(), mock(), nodeTypes);
	});

	describe('onMessage inventory (resolved through the real registry)', () => {
		it.each([
			[RESPOND_TO_CHAT_NODE_TYPE, true],
			[RESPOND_TO_WEBHOOK_NODE_TYPE, true],
			[CHAT_TOOL, true], // synthetic tool inherits onMessage from the base Chat node
			[TELEGRAM, false],
			[WAIT, false],
		])('%s implements onMessage: %s', (type, expected) => {
			const resolved = nodeTypes.getByNameAndVersion(type);
			expect(typeof resolved.onMessage === 'function').toBe(expected);
		});
	});

	describe('canResumeOverChat against real node types', () => {
		it('allows the Chat node', () => {
			expect(manager.canResumeOverChat(makeExecution(RESPOND_TO_CHAT_NODE_TYPE))).toBe(true);
		});

		it('allows the chat tool', () => {
			expect(manager.canResumeOverChat(makeExecution(CHAT_TOOL))).toBe(true);
		});

		it('allows RespondToWebhook', () => {
			expect(manager.canResumeOverChat(makeExecution(RESPOND_TO_WEBHOOK_NODE_TYPE))).toBe(true);
		});

		it('refuses a Telegram Send-and-Wait gate', () => {
			expect(manager.canResumeOverChat(makeExecution(TELEGRAM, { operation: 'sendAndWait' }))).toBe(
				false,
			);
		});

		it('refuses a plain Wait node', () => {
			expect(manager.canResumeOverChat(makeExecution(WAIT, { resume: 'timeInterval' }))).toBe(
				false,
			);
		});

		it('refuses a Wait node that waits for a form submission', () => {
			expect(manager.canResumeOverChat(makeExecution(WAIT, { resume: 'form' }))).toBe(false);
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
			executionRepository.findSingleExecution.mockResolvedValue(
				waitingExecution(RESPOND_TO_CHAT_NODE_TYPE),
			);

			await manager.cancelExecution('1');

			expect(executionRepository.update).toHaveBeenCalledWith({ id: '1' }, { status: 'canceled' });
		});

		it('does not cancel a Telegram Send-and-Wait execution the socket does not drive', async () => {
			executionRepository.findSingleExecution.mockResolvedValue(
				waitingExecution(TELEGRAM, { operation: 'sendAndWait' }),
			);

			await manager.cancelExecution('1');

			expect(executionRepository.update).not.toHaveBeenCalled();
		});

		it('does not cancel a plain Wait execution the socket does not drive', async () => {
			executionRepository.findSingleExecution.mockResolvedValue(
				waitingExecution(WAIT, { resume: 'timeInterval' }),
			);

			await manager.cancelExecution('1');

			expect(executionRepository.update).not.toHaveBeenCalled();
		});
	});
});
