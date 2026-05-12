import { mock } from 'jest-mock-extended';
import type {
	IExecuteData,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';

import { WorkflowExecute } from '../workflow-execute';

type ApplyTagsArgs = [
	Workflow,
	INode,
	IWorkflowExecuteAdditionalData,
	'manual',
	IRunExecutionData,
	number,
	INodeExecutionData[],
	IExecuteData,
];

describe('WorkflowExecute.applyCustomTelemetryTags', () => {
	const getParameterValue = jest.fn();
	const workflow = mock<Workflow>();
	(workflow.expression as unknown as { getParameterValue: jest.Mock }) = {
		getParameterValue,
	} as never;

	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		executionId: 'exec-1',
		webhookWaitingBaseUrl: 'https://n8n.local/webhook-waiting',
		formWaitingBaseUrl: 'https://n8n.local/form-waiting',
		variables: {},
	});

	let runExecutionData: IRunExecutionData;
	let workflowExecute: WorkflowExecute;
	let invokePrivate: (
		node: INode,
		executionData: IExecuteData,
		connectionInputData?: INodeExecutionData[],
	) => void;

	beforeEach(() => {
		jest.clearAllMocks();
		runExecutionData = createRunExecutionData();
		workflowExecute = new WorkflowExecute(additionalData, 'manual', runExecutionData);

		invokePrivate = (node, executionData, connectionInputData = [{ json: { env: 'prod' } }]) => {
			const args: ApplyTagsArgs = [
				workflow,
				node,
				additionalData,
				'manual',
				runExecutionData,
				0,
				connectionInputData,
				executionData,
			];
			(
				workflowExecute as unknown as { applyCustomTelemetryTags: (...a: ApplyTagsArgs) => void }
			).applyCustomTelemetryTags(...args);
		};
	});

	const baseNode: INode = {
		id: 'n1',
		name: 'Node1',
		type: 'test',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	const makeExecutionData = (overrides: Partial<IExecuteData> = {}): IExecuteData => ({
		node: baseNode,
		data: { main: [[{ json: { env: 'prod' } }]] },
		source: null,
		...overrides,
	});

	it('writes evaluated tag expressions into metadata.tracing', () => {
		const node: INode = {
			...baseNode,
			customTelemetryTags: {
				tag: [
					{ key: 'env', value: '={{ $json.env }}' },
					{ key: 'static', value: 'foo' },
				],
			},
		};
		getParameterValue.mockImplementation((value: string) =>
			value === '={{ $json.env }}' ? 'prod' : value,
		);

		const executionData = makeExecutionData({ node });

		invokePrivate(node, executionData);

		expect(executionData.metadata?.tracing).toEqual({ env: 'prod', static: 'foo' });
	});

	it('preserves existing setMetadata({tracing}) entries on key collision', () => {
		const node: INode = {
			...baseNode,
			customTelemetryTags: {
				tag: [{ key: 'env', value: 'user-set' }],
			},
		};
		getParameterValue.mockReturnValue('user-set');

		const executionData = makeExecutionData({
			node,
			metadata: { tracing: { env: 'node-authored' } },
		});

		invokePrivate(node, executionData);

		expect(executionData.metadata?.tracing).toEqual({ env: 'node-authored' });
	});

	it('skips tags with empty or whitespace keys', () => {
		const node: INode = {
			...baseNode,
			customTelemetryTags: {
				tag: [
					{ key: '   ', value: 'ignored' },
					{ key: 'kept', value: 'value' },
				],
			},
		};
		getParameterValue.mockImplementation((value: string) => value);

		const executionData = makeExecutionData({ node });

		invokePrivate(node, executionData);

		expect(executionData.metadata?.tracing).toEqual({ kept: 'value' });
	});

	it('coerces non-string evaluated values to strings', () => {
		const node: INode = {
			...baseNode,
			customTelemetryTags: {
				tag: [
					{ key: 'count', value: '={{ 42 }}' },
					{ key: 'enabled', value: '={{ true }}' },
				],
			},
		};
		getParameterValue.mockImplementation((value: string) => (value === '={{ 42 }}' ? 42 : true));

		const executionData = makeExecutionData({ node });

		invokePrivate(node, executionData);

		expect(executionData.metadata?.tracing).toEqual({ count: '42', enabled: 'true' });
	});

	it('ignores tags whose expression evaluates to null or undefined', () => {
		const node: INode = {
			...baseNode,
			customTelemetryTags: {
				tag: [
					{ key: 'maybe', value: '={{ $json.missing }}' },
					{ key: 'definitely', value: 'value' },
				],
			},
		};
		getParameterValue.mockImplementation((value: string) =>
			value === '={{ $json.missing }}' ? undefined : value,
		);

		const executionData = makeExecutionData({ node });

		invokePrivate(node, executionData);

		expect(executionData.metadata?.tracing).toEqual({ definitely: 'value' });
	});

	it('does not modify metadata when customTelemetryTags is absent', () => {
		const executionData = makeExecutionData();

		invokePrivate(baseNode, executionData);

		expect(executionData.metadata).toBeUndefined();
	});

	it('continues evaluating remaining tags after one expression throws', () => {
		const node: INode = {
			...baseNode,
			customTelemetryTags: {
				tag: [
					{ key: 'broken', value: '={{ $json.missing.deep }}' },
					{ key: 'ok', value: 'value' },
				],
			},
		};
		getParameterValue.mockImplementation((value: string) => {
			if (value === '={{ $json.missing.deep }}') throw new Error('boom');
			return value;
		});

		const executionData = makeExecutionData({ node });

		invokePrivate(node, executionData);

		expect(executionData.metadata?.tracing).toEqual({ ok: 'value' });
	});
});
