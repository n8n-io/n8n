import { mock } from 'jest-mock-extended';
import type {
	INode,
	INodeExecutionData,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { Container } from 'typedi';

import { InstanceSettings } from '@/InstanceSettings';

import { NodeExecutionContext } from '../node-execution-context';

class TestContext extends NodeExecutionContext {}

describe('NodeExecutionContext', () => {
	const instanceSettings = mock<InstanceSettings>({ instanceId: 'abc123' });
	Container.set(InstanceSettings, instanceSettings);

	const workflow = mock<Workflow>({
		id: '123',
		name: 'Test Workflow',
		active: true,
		nodeTypes: mock(),
		timezone: 'UTC',
	});
	const node = mock<INode>();
	let additionalData = mock<IWorkflowExecuteAdditionalData>({
		credentialsHelper: mock(),
	});

	const mode: WorkflowExecuteMode = 'manual';
	const testContext = new TestContext(workflow, node, additionalData, mode);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getNode', () => {
		it('should return a deep copy of the node', () => {
			const result = testContext.getNode();
			expect(result).not.toBe(node);
			expect(JSON.stringify(result)).toEqual(JSON.stringify(node));
		});
	});

	describe('getWorkflow', () => {
		it('should return the id, name, and active properties of the workflow', () => {
			const result = testContext.getWorkflow();

			expect(result).toEqual({ id: '123', name: 'Test Workflow', active: true });
		});
	});

	describe('getMode', () => {
		it('should return the mode property', () => {
			const result = testContext.getMode();
			expect(result).toBe(mode);
		});
	});

	describe('getWorkflowStaticData', () => {
		it('should call getStaticData method of workflow', () => {
			testContext.getWorkflowStaticData('testType');
			expect(workflow.getStaticData).toHaveBeenCalledWith('testType', node);
		});
	});

	describe('getChildNodes', () => {
		it('should return an array of NodeTypeAndVersion objects for the child nodes of the given node', () => {
			const childNode1 = mock<INode>({ name: 'Child Node 1', type: 'testType1', typeVersion: 1 });
			const childNode2 = mock<INode>({ name: 'Child Node 2', type: 'testType2', typeVersion: 2 });
			workflow.getChildNodes.mockReturnValue(['Child Node 1', 'Child Node 2']);
			workflow.nodes = {
				'Child Node 1': childNode1,
				'Child Node 2': childNode2,
			};

			const result = testContext.getChildNodes('Test Node');

			expect(result).toEqual([
				{ name: 'Child Node 1', type: 'testType1', typeVersion: 1 },
				{ name: 'Child Node 2', type: 'testType2', typeVersion: 2 },
			]);
		});
	});

	describe('getParentNodes', () => {
		it('should return an array of NodeTypeAndVersion objects for the parent nodes of the given node', () => {
			const parentNode1 = mock<INode>({ name: 'Parent Node 1', type: 'testType1', typeVersion: 1 });
			const parentNode2 = mock<INode>({ name: 'Parent Node 2', type: 'testType2', typeVersion: 2 });
			workflow.getParentNodes.mockReturnValue(['Parent Node 1', 'Parent Node 2']);
			workflow.nodes = {
				'Parent Node 1': parentNode1,
				'Parent Node 2': parentNode2,
			};

			const result = testContext.getParentNodes('Test Node');

			expect(result).toEqual([
				{ name: 'Parent Node 1', type: 'testType1', typeVersion: 1 },
				{ name: 'Parent Node 2', type: 'testType2', typeVersion: 2 },
			]);
		});
	});

	describe('getKnownNodeTypes', () => {
		it('should call getKnownTypes method of workflow.nodeTypes', () => {
			testContext.getKnownNodeTypes();
			expect(workflow.nodeTypes.getKnownTypes).toHaveBeenCalled();
		});
	});

	describe('getRestApiUrl', () => {
		it('should return the restApiUrl property of additionalData', () => {
			additionalData.restApiUrl = 'https://example.com/api';

			const result = testContext.getRestApiUrl();

			expect(result).toBe('https://example.com/api');
		});
	});

	describe('getInstanceBaseUrl', () => {
		it('should return the instanceBaseUrl property of additionalData', () => {
			additionalData.instanceBaseUrl = 'https://example.com';

			const result = testContext.getInstanceBaseUrl();

			expect(result).toBe('https://example.com');
		});
	});

	describe('getInstanceId', () => {
		it('should return the instanceId property of instanceSettings', () => {
			const result = testContext.getInstanceId();

			expect(result).toBe('abc123');
		});
	});

	describe('getTimezone', () => {
		it('should return the timezone property of workflow', () => {
			const result = testContext.getTimezone();
			expect(result).toBe('UTC');
		});
	});

	describe('getCredentialsProperties', () => {
		it('should call getCredentialsProperties method of additionalData.credentialsHelper', () => {
			testContext.getCredentialsProperties('testType');
			expect(additionalData.credentialsHelper.getCredentialsProperties).toHaveBeenCalledWith(
				'testType',
			);
		});
	});

	describe('prepareOutputData', () => {
		it('should return the input array wrapped in another array', async () => {
			const outputData = [mock<INodeExecutionData>(), mock<INodeExecutionData>()];

			const result = await testContext.prepareOutputData(outputData);

			expect(result).toEqual([outputData]);
		});
	});
});
