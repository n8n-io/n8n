import {
	AI_GATEWAY_MANAGED_TAG,
	TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE,
	instanceAiSetupCredentialAppliedKey,
	instanceAiSetupCredentialSelectionKey,
	readPendingInstanceAiSetupCredentialSelections,
	type InstanceAiSetupCredentialSelection,
} from '@n8n/api-types';
import type { NodeJSON, WorkflowJSON } from '@n8n/workflow-sdk';
import { mock } from 'vitest-mock-extended';

import type { ThreadPatch, ThreadRecord } from '../../../storage/thread-patch';
import type { InstanceAiContext, NodeDescription, SetupItemsEmitter } from '../../../types';
import { resolveCredentials, type CredentialMap } from '../resolve-credentials';
import {
	applyPendingSetupCredentialSelections,
	markSetupCredentialSelectionsApplied,
} from '../setup-credential-selections';

const itemId = 'workflow-1:credential:slackApi';
const selection: InstanceAiSetupCredentialSelection = {
	selectionId: 'choice-1',
	credentialType: 'slackApi',
	credentialId: 'selected-credential',
};
const credentialMap: CredentialMap = new Map([
	['slackApi', [{ id: 'selected-credential', name: 'Selected account', type: 'slackApi' }]],
	[
		'httpBasicAuth',
		[{ id: 'selected-credential', name: 'Selected account', type: 'httpBasicAuth' }],
	],
]);

function node(name: string, type = 'slackApi', overrides: Partial<NodeJSON> = {}): NodeJSON {
	return { id: name, name, type, typeVersion: 1, position: [0, 0], ...overrides };
}

function workflow(nodes: NodeJSON[]): WorkflowJSON {
	return { name: 'Test', nodes, connections: {} };
}

function createContext(metadata: Record<string, unknown>) {
	const thread: ThreadRecord = {
		id: 'thread-1',
		resourceId: 'user-1',
		metadata,
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	const threadMemory = {
		getThread: vi.fn(async () => thread),
		patchThread: vi.fn(
			async ({
				update,
			}: {
				update: (current: ThreadRecord) => ThreadPatch | null | undefined;
			}) => {
				Object.assign(thread, update(thread));
				return thread;
			},
		),
	};
	const context = mock<InstanceAiContext>({
		threadId: thread.id,
		threadMemory,
		setupItemsEmitter: mock<SetupItemsEmitter>(),
		logger: mock<InstanceAiContext['logger']>(),
		credentialService: mock<InstanceAiContext['credentialService']>(),
		workflowService: mock<InstanceAiContext['workflowService']>({
			getAsWorkflowJSON: vi.fn().mockResolvedValue(workflow([])),
		}),
		nodeService: mock<InstanceAiContext['nodeService']>({
			getNodeCredentialTypes: undefined,
			getDescription: vi.fn(
				async (type: string): Promise<NodeDescription> => ({
					name: type,
					displayName: type,
					description: '',
					version: 1,
					group: [],
					properties: [],
					inputs: [],
					outputs: [],
					credentials: [{ name: type, displayOptions: { hide: { authentication: ['none'] } } }],
				}),
			),
		}),
	});
	return { context, thread, threadMemory };
}

describe('setup credential selections', () => {
	it.each([false, true])(
		'keeps node-specific choices when inserted first: %s',
		async (specificFirst) => {
			const specific = {
				...selection,
				selectionId: 'specific',
				credentialId: 'specific-account',
				nodeNames: ['First'],
			};
			const entries = [
				[instanceAiSetupCredentialSelectionKey(itemId), selection],
				[instanceAiSetupCredentialSelectionKey(`${itemId}:First`), specific],
			];
			const { context } = createContext(
				Object.fromEntries(specificFirst ? entries.reverse() : entries),
			);
			const json = workflow([node('First'), node('Second')]);
			const candidates: CredentialMap = new Map([
				[
					'slackApi',
					[
						{ id: selection.credentialId, name: 'Default account', type: 'slackApi' },
						{ id: specific.credentialId, name: 'Specific account', type: 'slackApi' },
					],
				],
			]);
			const result = await applyPendingSetupCredentialSelections(
				json,
				'workflow-1',
				context,
				candidates,
			);
			expect(json.nodes.map((current) => current.credentials?.slackApi?.id)).toEqual([
				'specific-account',
				'selected-credential',
			]);
			expect(result.resolvedCredentialsByNode.First).toEqual([
				{ type: 'slackApi', id: 'specific-account', name: 'Specific account' },
			]);
		},
	);

	it('applies an early choice to compatible nodes with the stored credential name', async () => {
		const { context } = createContext({
			[instanceAiSetupCredentialSelectionKey(itemId)]: selection,
		});
		const json = workflow([
			node('First', 'slackApi', { credentials: { slackApi: { id: 'old', name: 'Old' } } }),
			node('Second'),
			node('Other service', 'gmailOAuth2'),
			node('Inactive', 'slackApi', { parameters: { authentication: 'none' } }),
			node('Disabled', 'slackApi', { disabled: true }),
		]);
		const result = await applyPendingSetupCredentialSelections(
			json,
			'workflow-1',
			context,
			credentialMap,
		);
		expect(json.nodes.map(({ credentials }) => credentials)).toEqual([
			{ slackApi: { id: 'selected-credential', name: 'Selected account' } },
			{ slackApi: { id: 'selected-credential', name: 'Selected account' } },
			undefined,
			undefined,
			undefined,
		]);
		expect(Object.keys(result.resolvedCredentialsByNode)).toEqual(['First', 'Second']);
		expect(result.consumedSelections).toEqual([{ itemId, selection }]);
	});

	it('keeps an unavailable choice open and removes its previous binding', async () => {
		const { context } = createContext({
			[instanceAiSetupCredentialSelectionKey(itemId)]: selection,
		});
		const json = workflow([
			node('Slack', 'slackApi', {
				credentials: { slackApi: { id: 'other-project', name: 'Other' } },
			}),
		]);
		vi.mocked(context.workflowService.getAsWorkflowJSON).mockResolvedValue(structuredClone(json));
		const result = await applyPendingSetupCredentialSelections(
			json,
			'workflow-1',
			context,
			new Map(),
		);
		expect(json.nodes[0].credentials).toEqual({});
		expect(result.unavailableCredentialTypes).toEqual(['slackApi']);
		expect(result.consumedSelections).toEqual([]);
		await resolveCredentials(
			json,
			'workflow-1',
			context,
			new Map(),
			result.unavailableCredentialTypes,
		);
		expect(json.nodes[0].credentials).toEqual({});
	});

	it('keeps an explicit custom-auth choice through automatic resolution', async () => {
		const customType = TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE;
		const customSelection = { ...selection, credentialType: customType, nodeNames: ['API'] };
		const { context } = createContext({
			[instanceAiSetupCredentialSelectionKey(`workflow-1:credential:${customType}:API`)]:
				customSelection,
		});
		const json = workflow([node('API', customType)]);
		const customMap: CredentialMap = new Map([
			[customType, [{ id: selection.credentialId, name: 'Selected account', type: customType }]],
		]);
		const selected = await applyPendingSetupCredentialSelections(
			json,
			'workflow-1',
			context,
			customMap,
		);
		const resolved = await resolveCredentials(
			json,
			'workflow-1',
			context,
			customMap,
			undefined,
			selected.resolvedCredentialsByNode,
		);
		expect(json.nodes[0].credentials?.[customType]).toEqual({
			id: selection.credentialId,
			name: 'Selected account',
		});
		expect(resolved.mockedNodeNames).toEqual([]);
	});

	it('applies generic credentials only to the selected nodes', async () => {
		const genericSelection = {
			...selection,
			credentialType: 'httpBasicAuth',
			nodeNames: ['First'],
		};
		const genericId = 'workflow-1:credential:httpBasicAuth:First';
		const { context } = createContext({
			[instanceAiSetupCredentialSelectionKey(genericId)]: genericSelection,
		});
		const json = workflow([node('First', 'httpBasicAuth'), node('Second', 'httpBasicAuth')]);
		await applyPendingSetupCredentialSelections(json, 'workflow-1', context, credentialMap);
		expect(json.nodes[0].credentials).toEqual({
			httpBasicAuth: { id: 'selected-credential', name: 'Selected account' },
		});
		expect(json.nodes[1].credentials).toBeUndefined();
	});

	it('does not fan a generic credential out without node names', async () => {
		const { context } = createContext({
			[instanceAiSetupCredentialSelectionKey('workflow-1:credential:httpBasicAuth')]: {
				...selection,
				credentialType: 'httpBasicAuth',
			},
		});
		const json = workflow([node('First', 'httpBasicAuth')]);
		await applyPendingSetupCredentialSelections(json, 'workflow-1', context, credentialMap);
		expect(json.nodes[0].credentials).toBeUndefined();
	});

	it('validates Gateway support before applying its marker', async () => {
		const { context } = createContext({
			[instanceAiSetupCredentialSelectionKey(itemId)]: {
				...selection,
				credentialId: AI_GATEWAY_MANAGED_TAG,
			},
		});
		const json = workflow([node('Slack')]);
		vi.mocked(context.credentialService.isAiGatewayCredentialType!).mockResolvedValue(false);
		expect(
			(await applyPendingSetupCredentialSelections(json, 'workflow-1', context, credentialMap))
				.unavailableCredentialTypes,
		).toEqual(['slackApi']);
		vi.mocked(context.credentialService.isAiGatewayCredentialType!).mockResolvedValue(true);
		await applyPendingSetupCredentialSelections(json, 'workflow-1', context, credentialMap);
		expect(json.nodes[0].credentials).toEqual({
			slackApi: { id: null, name: 'Gateway credits', __aiGatewayManaged: true },
		});
	});

	it('keeps selected Gateway credits when a stored alternative exists', async () => {
		const { context } = createContext({
			[instanceAiSetupCredentialSelectionKey(itemId)]: {
				...selection,
				credentialId: AI_GATEWAY_MANAGED_TAG,
			},
		});
		vi.mocked(context.credentialService.isAiGatewayCredentialType!).mockResolvedValue(true);
		const json = workflow([
			node('Slack', 'slackApi', {
				credentials: { slackApi: { id: 'selected-credential', name: 'Stored account' } },
			}),
		]);
		const selected = await applyPendingSetupCredentialSelections(
			json,
			'workflow-1',
			context,
			credentialMap,
		);
		const resolved = await resolveCredentials(
			json,
			'workflow-1',
			context,
			credentialMap,
			undefined,
			selected.resolvedCredentialsByNode,
		);

		expect(json.nodes[0].credentials).toEqual({
			slackApi: { id: null, name: 'Gateway credits', __aiGatewayManaged: true },
		});
		expect(resolved.resolvedCredentialsByNode.Slack).toEqual([
			{ type: 'slackApi', id: null, name: 'Gateway credits', __aiGatewayManaged: true },
		]);
		expect(resolved.mockedCredentialTypes).toEqual([]);
	});

	it('settles a removed requirement without modifying its credential', async () => {
		const { context, thread } = createContext({
			[instanceAiSetupCredentialSelectionKey(itemId)]: selection,
		});
		const result = await applyPendingSetupCredentialSelections(
			workflow([]),
			'workflow-1',
			context,
			credentialMap,
		);
		await markSetupCredentialSelectionsApplied(context, result.consumedSelections);
		expect(readPendingInstanceAiSetupCredentialSelections(thread.metadata, 'workflow-1')).toEqual(
			[],
		);
		expect(context.credentialService.delete).not.toHaveBeenCalled();
	});

	it('preserves a newer selection when the earlier workflow save finishes', async () => {
		const { context, thread } = createContext({
			[instanceAiSetupCredentialSelectionKey(itemId)]: selection,
		});
		const result = await applyPendingSetupCredentialSelections(
			workflow([node('Slack')]),
			'workflow-1',
			context,
			credentialMap,
		);
		const newerSelection = { ...selection, selectionId: 'choice-2' };
		thread.metadata = { [instanceAiSetupCredentialSelectionKey(itemId)]: newerSelection };
		await markSetupCredentialSelectionsApplied(context, result.consumedSelections);
		expect(
			thread.metadata[instanceAiSetupCredentialAppliedKey(itemId, newerSelection.selectionId)],
		).toBeUndefined();
		expect(readPendingInstanceAiSetupCredentialSelections(thread.metadata, 'workflow-1')).toEqual([
			{ itemId, selection: newerSelection },
		]);
	});

	it('keeps the choice pending if marking a successful save fails', async () => {
		const { context, thread, threadMemory } = createContext({
			[instanceAiSetupCredentialSelectionKey(itemId)]: selection,
		});
		threadMemory.patchThread.mockRejectedValue(new Error('Storage unavailable'));
		await expect(
			markSetupCredentialSelectionsApplied(context, [{ itemId, selection }]),
		).resolves.toBeUndefined();
		expect(readPendingInstanceAiSetupCredentialSelections(thread.metadata, 'workflow-1')).toEqual([
			{ itemId, selection },
		]);
		expect(context.logger.warn).toHaveBeenCalled();
	});

	it('does not read selections when the setup panel is disabled', async () => {
		const { context, threadMemory } = createContext({
			[instanceAiSetupCredentialSelectionKey(itemId)]: selection,
		});
		context.setupItemsEmitter = undefined;
		await applyPendingSetupCredentialSelections(
			workflow([node('Slack')]),
			'workflow-1',
			context,
			credentialMap,
		);
		expect(threadMemory.getThread).not.toHaveBeenCalled();
	});
});
