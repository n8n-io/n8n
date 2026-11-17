import {
	createRunExecutionData,
	type IDataObject,
	type IExecuteData,
	type IExecutionContext,
	type INodeType,
	type INodeTypeDescription,
	type INodeTypes,
	type IWorkflowSettings,
	type Workflow,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { captureTriggerData, MAX_TRIGGER_DATA_BYTES } from '../trigger-data';

describe('captureTriggerData', () => {
	const triggerItem = {
		headers: { 'x-correlation-id': 'corr-1' },
		query: {},
		body: { hello: 'world' },
	};

	const createWorkflow = (
		settings: IWorkflowSettings,
		group: INodeTypeDescription['group'] = ['trigger'],
	) => {
		const nodeTypes = mock<INodeTypes>();
		nodeTypes.getByNameAndVersion.mockReturnValue(mock<INodeType>({ description: { group } }));
		// A plain object: a mock answers every missing setting with a truthy function.
		return { settings, nodeTypes } as unknown as Workflow;
	};

	const createStartItem = (json: IExecuteData['data']['main'][0]): IExecuteData => ({
		node: {
			id: '1',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		},
		data: { main: [json] },
		source: null,
	});

	const createRunData = (redaction?: IExecutionContext['redaction']) => {
		const runExecutionData = createRunExecutionData({
			executionData: { nodeExecutionStack: [] },
		});
		runExecutionData.executionData!.runtimeData = {
			version: 1,
			establishedAt: 0,
			source: 'webhook',
			redaction,
		};
		return runExecutionData;
	};

	it('returns the JSON of the first trigger item when the setting is on', () => {
		const result = captureTriggerData(
			createWorkflow({ shareTriggerData: true }),
			createStartItem([{ json: triggerItem }, { json: { second: true } }]),
			createRunData(),
			'webhook',
		);

		expect(result).toEqual(triggerItem);
	});

	it('returns nothing when the setting is not set', () => {
		const result = captureTriggerData(
			createWorkflow({}),
			createStartItem([{ json: triggerItem }]),
			createRunData(),
			'webhook',
		);

		expect(result).toBeUndefined();
	});

	it('returns nothing when the start node is not a trigger', () => {
		const result = captureTriggerData(
			createWorkflow({ shareTriggerData: true }, ['transform']),
			createStartItem([{ json: triggerItem }]),
			createRunData(),
			'manual',
		);

		expect(result).toBeUndefined();
	});

	it('returns nothing when the run redacts production data', () => {
		const result = captureTriggerData(
			createWorkflow({ shareTriggerData: true }),
			createStartItem([{ json: triggerItem }]),
			createRunData({ version: 2, production: true, manual: false }),
			'webhook',
		);

		expect(result).toBeUndefined();
	});

	it('returns nothing when the item is larger than the limit', () => {
		const result = captureTriggerData(
			createWorkflow({ shareTriggerData: true }),
			createStartItem([{ json: { body: 'x'.repeat(MAX_TRIGGER_DATA_BYTES) } }]),
			createRunData(),
			'webhook',
		);

		expect(result).toBeUndefined();
	});

	it('returns nothing when the item cannot be serialized', () => {
		const circular: IDataObject = {};
		circular.self = circular;

		const result = captureTriggerData(
			createWorkflow({ shareTriggerData: true }),
			createStartItem([{ json: circular }]),
			createRunData(),
			'webhook',
		);

		expect(result).toBeUndefined();
	});

	it('returns nothing when the trigger produced no item', () => {
		const result = captureTriggerData(
			createWorkflow({ shareTriggerData: true }),
			createStartItem([]),
			createRunData(),
			'webhook',
		);

		expect(result).toBeUndefined();
	});
});
