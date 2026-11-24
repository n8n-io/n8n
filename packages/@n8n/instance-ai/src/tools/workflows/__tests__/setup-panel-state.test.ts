import type { InstanceAiEvent } from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';

import type { InstanceAiContext } from '../../../types';
import { createSetupItemsEmitter } from '../setup-items';
import {
	describeSetupItem,
	formatWorkflowSetupStateNote,
	observeWorkflowSetupStates,
	openSetupItemIds,
	recordWorkflowSetupState,
	summarizeWorkflowSetupState,
} from '../setup-panel-state';
import type { SetupRequest } from '../setup-workflow.schema';
import { analyzeWorkflow } from '../setup-workflow.service';

vi.mock('../setup-workflow.service', () => ({
	analyzeWorkflow: vi.fn(),
}));

function request(overrides: {
	nodeName: string;
	credentialType?: string;
	boundCredentialId?: string;
	credentialNeedsAction?: boolean;
	parameterIssues?: Record<string, string[]>;
}): SetupRequest {
	const credentials =
		overrides.credentialType && overrides.boundCredentialId
			? { [overrides.credentialType]: { id: overrides.boundCredentialId, name: 'Stored' } }
			: undefined;
	const hasIssues = Object.keys(overrides.parameterIssues ?? {}).length > 0;
	return {
		node: {
			name: overrides.nodeName,
			type: 'n8n-nodes-base.test',
			...(credentials ? { credentials } : {}),
		},
		...(overrides.credentialType ? { credentialType: overrides.credentialType } : {}),
		...(overrides.credentialNeedsAction !== undefined
			? { credentialNeedsAction: overrides.credentialNeedsAction }
			: {}),
		...(overrides.parameterIssues ? { parameterIssues: overrides.parameterIssues } : {}),
		needsAction: overrides.credentialNeedsAction === true || hasIssues,
	} as unknown as SetupRequest;
}

const openSlack = request({
	nodeName: 'Slack',
	credentialType: 'slackApi',
	credentialNeedsAction: true,
});
const boundGmail = request({
	nodeName: 'Gmail',
	credentialType: 'gmailOAuth2',
	boundCredentialId: 'cred-1',
	credentialNeedsAction: false,
});
const sheetParams = request({ nodeName: 'Sheet', parameterIssues: { documentId: ['missing'] } });

function threadMemory(initialMetadata: Record<string, unknown> = {}) {
	let metadata = { ...initialMetadata };
	return {
		metadata: () => metadata,
		getThread: vi.fn(
			async () =>
				await Promise.resolve({
					id: 'thread-1',
					resourceId: 'user-1',
					createdAt: new Date(),
					updatedAt: new Date(),
					metadata,
				}),
		),
		patchThread: vi.fn(
			async (args: {
				update: (current: { metadata: Record<string, unknown> }) => {
					metadata?: Record<string, unknown>;
				} | null;
			}) => {
				const patch = args.update({ metadata: { ...metadata } });
				if (patch?.metadata) metadata = patch.metadata;
				return await Promise.resolve(null);
			},
		),
	};
}

function context(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		logger: { warn: vi.fn(), debug: vi.fn() },
		threadId: 'thread-1',
		...overrides,
	} as unknown as InstanceAiContext;
}

function emitter() {
	const published: InstanceAiEvent[] = [];
	return {
		published,
		emitter: createSetupItemsEmitter({
			eventBus: { publish: (_threadId, event) => published.push(event) },
			threadId: 'thread-1',
			runId: 'run-1',
			agentId: 'orchestrator',
		}),
	};
}

describe('openSetupItemIds', () => {
	it('lists open credential slots and nodes with parameter issues, not bound slots', () => {
		expect([...openSetupItemIds('wf-1', [openSlack, boundGmail, sheetParams])]).toEqual([
			'wf-1:credential:slackApi',
			'wf-1:parameters:Sheet',
		]);
	});
});

describe('summarizeWorkflowSetupState', () => {
	it('splits the snapshot into open and configured items', () => {
		const summary = summarizeWorkflowSetupState('wf-1', [openSlack, boundGmail, sheetParams]);

		expect(summary.items.map((item) => item.id)).toEqual([
			'wf-1:credential:slackApi',
			'wf-1:credential:gmailOAuth2',
			'wf-1:parameters:Sheet',
		]);
		expect(summary.open.map((item) => item.id)).toEqual([
			'wf-1:credential:slackApi',
			'wf-1:parameters:Sheet',
		]);
		expect(summary.configured.map((item) => item.id)).toEqual(['wf-1:credential:gmailOAuth2']);
		expect(summary.settledSinceLastLook).toEqual([]);
	});

	it('names items that were open at the previous look and are not anymore', () => {
		const previouslyOpen = new Set([
			'wf-1:credential:gmailOAuth2', // bound since: still in the snapshot
			'wf-1:parameters:Sheet', // resolved since: gone from the snapshot
			'wf-1:credential:httpBasicAuth:Removed:primary', // node removed since
			'wf-1:credential:slackApi', // still open
		]);

		const summary = summarizeWorkflowSetupState('wf-1', [openSlack, boundGmail], previouslyOpen);

		expect(summary.settledSinceLastLook).toEqual([
			{ kind: 'credential', credentialType: 'gmailOAuth2', nodes: ['Gmail'] },
			{ kind: 'parameters', nodeName: 'Sheet' },
			{ kind: 'credential', credentialType: 'httpBasicAuth', nodes: ['Removed:primary'] },
		]);
	});
});

describe('describeSetupItem', () => {
	it('keeps only what the agent needs to name the item', () => {
		expect(
			describeSetupItem({
				id: 'wf-1:credential:slackApi',
				kind: 'credential',
				credentialType: 'slackApi',
				nodeBindings: [{ nodeName: 'Slack' }],
				setupHint: { template: {}, placeholders: [] },
			}),
		).toEqual({ kind: 'credential', credentialType: 'slackApi', nodes: ['Slack'] });
		expect(
			describeSetupItem({
				id: 'wf-1:parameters:Sheet',
				kind: 'parameters',
				nodeName: 'Sheet',
				parameterNames: ['documentId'],
			}),
		).toEqual({ kind: 'parameters', nodeName: 'Sheet', parameterNames: ['documentId'] });
	});
});

describe('recordWorkflowSetupState', () => {
	it('announces the snapshot and remembers the open items in thread metadata', async () => {
		const memory = threadMemory();
		const { emitter: setupItemsEmitter, published } = emitter();
		const ctx = context({ threadMemory: memory, setupItemsEmitter });

		const summary = await recordWorkflowSetupState(ctx, 'wf-1', [openSlack, boundGmail]);

		expect(published).toHaveLength(1);
		expect(published[0]).toMatchObject({
			type: 'setup-items',
			payload: { workflowId: 'wf-1', items: summary.items },
		});
		expect(memory.metadata()).toEqual({
			instanceAiSetupPanelOpenItems: { 'wf-1': ['wf-1:credential:slackApi'] },
		});
	});

	it('diffs against the previous look and replaces the memo', async () => {
		const memory = threadMemory({
			instanceAiSetupPanelOpenItems: {
				'wf-1': ['wf-1:credential:slackApi', 'wf-1:credential:gmailOAuth2'],
			},
		});
		const ctx = context({ threadMemory: memory, setupItemsEmitter: emitter().emitter });

		const summary = await recordWorkflowSetupState(ctx, 'wf-1', [openSlack, boundGmail]);

		expect(summary.settledSinceLastLook).toEqual([
			{ kind: 'credential', credentialType: 'gmailOAuth2', nodes: ['Gmail'] },
		]);
		expect(memory.metadata()).toEqual({
			instanceAiSetupPanelOpenItems: { 'wf-1': ['wf-1:credential:slackApi'] },
		});
	});

	it('keeps other keys in the thread metadata and caps the memo to recent workflows', async () => {
		const stale = Object.fromEntries(
			Array.from({ length: 10 }, (_, i) => [`wf-old-${i}`, [`wf-old-${i}:parameters:N`]]),
		);
		const memory = threadMemory({ other: 'kept', instanceAiSetupPanelOpenItems: stale });
		const ctx = context({ threadMemory: memory });

		await recordWorkflowSetupState(ctx, 'wf-new', [openSlack]);

		const memo = memory.metadata().instanceAiSetupPanelOpenItems as Record<string, string[]>;
		expect(memory.metadata().other).toBe('kept');
		expect(Object.keys(memo)).toHaveLength(10);
		expect(memo['wf-old-0']).toBeUndefined();
		expect(memo['wf-new']).toEqual(['wf-new:credential:slackApi']);
	});

	it('never throws: a failing emitter or memo is logged and the summary still returns', async () => {
		const warn = vi.fn();
		const ctx = context({
			logger: { warn, debug: vi.fn() } as unknown as InstanceAiContext['logger'],
			threadMemory: {
				getThread: vi.fn().mockRejectedValue(new Error('read failed')),
				patchThread: vi.fn().mockRejectedValue(new Error('write failed')),
			},
			setupItemsEmitter: {
				emit: vi.fn(() => {
					throw new Error('publish failed');
				}),
				merge: vi.fn(() => true),
				announce: vi.fn().mockResolvedValue(undefined),
				workflowIds: vi.fn(() => []),
				lastWorkflowId: vi.fn(),
			},
		});

		const summary = await recordWorkflowSetupState(ctx, 'wf-1', [openSlack]);

		expect(summary.open).toHaveLength(1);
		expect(warn).toHaveBeenCalledTimes(3);
	});
});

describe('observeWorkflowSetupStates', () => {
	beforeEach(() => {
		vi.mocked(analyzeWorkflow).mockReset();
	});

	it('re-analyzes each workflow with settled requests and skips one that fails', async () => {
		vi.mocked(analyzeWorkflow).mockImplementation(async (_context, workflowId) =>
			workflowId === 'wf-gone'
				? await Promise.reject(new Error('not found'))
				: await Promise.resolve([openSlack]),
		);
		const ctx = context({ setupItemsEmitter: emitter().emitter });

		const summaries = await observeWorkflowSetupStates(ctx, ['wf-gone', 'wf-1']);

		expect(analyzeWorkflow).toHaveBeenCalledWith(ctx, 'wf-1', undefined, {
			includeSettled: true,
			validationMode: 'configuration',
		});
		expect(summaries.map((summary) => summary.workflowId)).toEqual(['wf-1']);
	});

	it('preserves announced recipes and the current build target during observation', async () => {
		const { emitter: setupItemsEmitter, published } = emitter();
		const items = summarizeWorkflowSetupState('wf-1', [
			{ ...openSlack, setupHint: { template: {}, placeholders: [] } },
		]).items;
		setupItemsEmitter.emit('wf-1', items);
		setupItemsEmitter.emit('wf-2', []);
		vi.mocked(analyzeWorkflow).mockResolvedValue([openSlack]);

		await observeWorkflowSetupStates(context({ setupItemsEmitter }), ['wf-2', 'wf-1']);

		expect(published).toHaveLength(2);
		expect(setupItemsEmitter.lastWorkflowId()).toBe('wf-2');
		expect(setupItemsEmitter.emit('wf-1', items)).toBe(false);
	});

	it('does not turn a historical workflow into the target for standalone credentials', async () => {
		const setupItemsEmitter = createSetupItemsEmitter({
			eventBus: { publish: vi.fn() },
			threadId: 'thread-1',
			runId: 'run-2',
			agentId: 'orchestrator',
			initialSnapshots: [{ workflowId: 'wf-old', items: [] }],
		});
		vi.mocked(analyzeWorkflow).mockResolvedValue([openSlack]);

		await observeWorkflowSetupStates(context({ setupItemsEmitter }), ['wf-old']);

		expect(setupItemsEmitter.lastWorkflowId()).toBeUndefined();
	});

	it('does not report temporary credential replacement as user progress', async () => {
		const memory = threadMemory();
		const ctx = context({ threadMemory: memory, setupItemsEmitter: emitter().emitter });
		await recordWorkflowSetupState(ctx, 'wf-1', [
			{ ...openSlack, preferNewCredential: true, parameterIssues: { channel: ['missing'] } },
		]);
		vi.mocked(analyzeWorkflow).mockResolvedValue([
			{ ...openSlack, credentialNeedsAction: false, parameterIssues: { channel: ['missing'] } },
		]);

		const [summary] = await observeWorkflowSetupStates(ctx, ['wf-1']);

		expect(summary.settledSinceLastLook).toEqual([]);
		expect(memory.metadata().instanceAiSetupPanelOpenItems).toEqual({
			'wf-1': ['wf-1:parameters:Slack'],
		});
	});

	it('caps the number of workflows it analyzes per turn', async () => {
		vi.mocked(analyzeWorkflow).mockResolvedValue([]);

		await observeWorkflowSetupStates(context(), ['a', 'b', 'c', 'd', 'e']);

		expect(analyzeWorkflow).toHaveBeenCalledTimes(3);
	});
});

describe('formatWorkflowSetupStateNote', () => {
	it('is empty when there is nothing to report', () => {
		expect(formatWorkflowSetupStateNote([])).toBe('');
	});

	it('renders a compact JSON state after the guidance', () => {
		const summary = summarizeWorkflowSetupState(
			'wf-1',
			[openSlack, boundGmail],
			new Set(['wf-1:credential:gmailOAuth2']),
		);

		const note = formatWorkflowSetupStateNote([summary]);
		const [guidance, json] = note.split('\n');

		expect(guidance).toContain('not proof of a successful connection test');
		expect(jsonParse(json)).toEqual({
			workflows: [
				{
					workflowId: 'wf-1',
					open: [{ kind: 'credential', credentialType: 'slackApi', nodes: ['Slack'] }],
					configured: [{ kind: 'credential', credentialType: 'gmailOAuth2', nodes: ['Gmail'] }],
					settledSinceLastTurn: [
						{ kind: 'credential', credentialType: 'gmailOAuth2', nodes: ['Gmail'] },
					],
				},
			],
		});
	});
});
