import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type {
	Expression,
	INode,
	INodeType,
	INodeTypes,
	INodeExecutionData,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { InstanceSettings } from '@/instance-settings';

import { NodeExecutionContext } from '../node-execution-context';

class TestContext extends NodeExecutionContext {}

describe('NodeExecutionContext', () => {
	const instanceSettings = mock<InstanceSettings>({ instanceId: 'abc123' });
	Container.set(InstanceSettings, instanceSettings);

	const node = mock<INode>();
	const nodeType = mock<INodeType>({ description: mock() });
	const nodeTypes = mock<INodeTypes>();
	const expression = mock<Expression>();
	const workflow = mock<Workflow>({
		id: '123',
		name: 'Test Workflow',
		active: true,
		nodeTypes,
		timezone: 'UTC',
		expression,
	});
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		credentialsHelper: mock(),
	});

	const mode: WorkflowExecuteMode = 'manual';
	let testContext: TestContext;

	beforeEach(() => {
		jest.clearAllMocks();
		testContext = new TestContext(workflow, node, additionalData, mode);
		nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
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

			expect(result).toMatchObject([
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

			expect(result).toMatchObject([
				{ name: 'Parent Node 1', type: 'testType1', typeVersion: 1 },
				{ name: 'Parent Node 2', type: 'testType2', typeVersion: 2 },
			]);
		});
	});

	describe('getKnownNodeTypes', () => {
		it('should call getKnownTypes method of nodeTypes', () => {
			testContext.getKnownNodeTypes();
			expect(nodeTypes.getKnownTypes).toHaveBeenCalled();
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

	describe('getNodeInputs', () => {
		it('should return static inputs array when inputs is an array', () => {
			nodeType.description.inputs = [NodeConnectionTypes.Main, NodeConnectionTypes.AiLanguageModel];

			const result = testContext.getNodeInputs();

			expect(result).toEqual([
				{ type: NodeConnectionTypes.Main },
				{ type: NodeConnectionTypes.AiLanguageModel },
			]);
		});

		it('should return input objects when inputs contains configurations', () => {
			nodeType.description.inputs = [
				{ type: NodeConnectionTypes.Main },
				{ type: NodeConnectionTypes.AiLanguageModel, required: true },
			];

			const result = testContext.getNodeInputs();

			expect(result).toEqual([
				{ type: NodeConnectionTypes.Main },
				{ type: NodeConnectionTypes.AiLanguageModel, required: true },
			]);
		});

		it('should evaluate dynamic inputs when inputs is a function', () => {
			const inputsExpressions = '={{ ["main", "ai_languageModel"] }}';
			nodeType.description.inputs = inputsExpressions;
			expression.getSimpleParameterValue.mockReturnValue([
				NodeConnectionTypes.Main,
				NodeConnectionTypes.AiLanguageModel,
			]);

			const result = testContext.getNodeInputs();

			expect(result).toEqual([
				{ type: NodeConnectionTypes.Main },
				{ type: NodeConnectionTypes.AiLanguageModel },
			]);
			expect(expression.getSimpleParameterValue).toHaveBeenCalledWith(
				node,
				inputsExpressions,
				'internal',
				{},
			);
		});
	});

	describe('getNodeOutputs', () => {
		it('should return static outputs array when outputs is an array', () => {
			nodeType.description.outputs = [
				NodeConnectionTypes.Main,
				NodeConnectionTypes.AiLanguageModel,
			];

			const result = testContext.getNodeOutputs();

			expect(result).toEqual([
				{ type: NodeConnectionTypes.Main },
				{ type: NodeConnectionTypes.AiLanguageModel },
			]);
		});

		it('should return output objects when outputs contains configurations', () => {
			nodeType.description.outputs = [
				{ type: NodeConnectionTypes.Main },
				{ type: NodeConnectionTypes.AiLanguageModel, required: true },
			];

			const result = testContext.getNodeOutputs();

			expect(result).toEqual([
				{ type: NodeConnectionTypes.Main },
				{ type: NodeConnectionTypes.AiLanguageModel, required: true },
			]);
		});

		it('should evaluate dynamic outputs when outputs is a function', () => {
			const outputsExpressions = '={{ ["main", "ai_languageModel"] }}';
			nodeType.description.outputs = outputsExpressions;
			expression.getSimpleParameterValue.mockReturnValue([
				NodeConnectionTypes.Main,
				NodeConnectionTypes.AiLanguageModel,
			]);

			const result = testContext.getNodeOutputs();

			expect(result).toEqual([
				{ type: NodeConnectionTypes.Main },
				{ type: NodeConnectionTypes.AiLanguageModel },
			]);
			expect(expression.getSimpleParameterValue).toHaveBeenCalledWith(
				node,
				outputsExpressions,
				'internal',
				{},
			);
		});

		it('should add error output when node has continueOnFail error handling', () => {
			const nodeWithError = mock<INode>({ onError: 'continueErrorOutput' });
			const contextWithError = new TestContext(workflow, nodeWithError, additionalData, mode);
			nodeType.description.outputs = [NodeConnectionTypes.Main];

			const result = contextWithError.getNodeOutputs();

			expect(result).toEqual([
				{ type: NodeConnectionTypes.Main, displayName: 'Success' },
				{ type: NodeConnectionTypes.Main, displayName: 'Error', category: 'error' },
			]);
		});
	});

	describe('getConnectedNodes', () => {
		it('should return connected nodes of given type', () => {
			const node1 = mock<INode>({ name: 'Node 1', type: 'test', disabled: false });
			const node2 = mock<INode>({ name: 'Node 2', type: 'test', disabled: false });

			workflow.getParentNodes.mockReturnValue(['Node 1', 'Node 2']);
			workflow.getNode.mockImplementation((name) => {
				if (name === 'Node 1') return node1;
				if (name === 'Node 2') return node2;
				return null;
			});

			const result = testContext.getConnectedNodes(NodeConnectionTypes.Main);

			expect(result).toEqual([node1, node2]);
			expect(workflow.getParentNodes).toHaveBeenCalledWith(node.name, NodeConnectionTypes.Main, 1);
		});

		it('should filter out disabled nodes', () => {
			const node1 = mock<INode>({ name: 'Node 1', type: 'test', disabled: false });
			const node2 = mock<INode>({ name: 'Node 2', type: 'test', disabled: true });

			workflow.getParentNodes.mockReturnValue(['Node 1', 'Node 2']);
			workflow.getNode.mockImplementation((name) => {
				if (name === 'Node 1') return node1;
				if (name === 'Node 2') return node2;
				return null;
			});

			const result = testContext.getConnectedNodes(NodeConnectionTypes.Main);

			expect(result).toEqual([node1]);
		});

		it('should filter out non-existent nodes', () => {
			const node1 = mock<INode>({ name: 'Node 1', type: 'test', disabled: false });

			workflow.getParentNodes.mockReturnValue(['Node 1', 'NonExistent']);
			workflow.getNode.mockImplementation((name) => {
				if (name === 'Node 1') return node1;
				return null;
			});

			const result = testContext.getConnectedNodes(NodeConnectionTypes.Main);

			expect(result).toEqual([node1]);
		});
	});
});
