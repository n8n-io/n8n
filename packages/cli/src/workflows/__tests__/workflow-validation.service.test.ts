import type { WorkflowRepository } from '@n8n/db';
import type { INode, IConnections, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';

import type { NodeTypes } from '@/node-types';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';

describe('WorkflowValidationService', () => {
	let service: WorkflowValidationService;
	let mockWorkflowRepository: ReturnType<typeof mock<WorkflowRepository>>;

	beforeEach(() => {
		mockWorkflowRepository = mock<WorkflowRepository>();
		service = new WorkflowValidationService(mockWorkflowRepository);
	});

	describe('validateSubWorkflowReferences', () => {
		const createExecuteWorkflowNode = (
			name: string,
			workflowId: string | { value: string },
			options?: { disabled?: boolean; source?: string },
		): INode => ({
			name,
			type: 'n8n-nodes-base.executeWorkflow',
			id: `node-${name}`,
			typeVersion: 1,
			position: [0, 0],
			disabled: options?.disabled,
			parameters: {
				workflowId,
				...(options?.source && { source: options.source }),
			},
		});

		it('should return valid when no executeWorkflow nodes exist', async () => {
			const nodes: INode[] = [
				{
					name: 'Set',
					type: 'n8n-nodes-base.set',
					id: 'node-1',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			];

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(true);
		});

		it('should return valid when all referenced sub-workflows are published', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('Sub-workflow 1', { value: 'workflow-1' }),
				createExecuteWorkflowNode('Sub-workflow 2', { value: 'workflow-2' }),
			];

			mockWorkflowRepository.get.mockImplementation(
				async ({ id }) =>
					({
						id: id as string,
						name: `Workflow ${id}`,
						activeVersionId: 'version-id',
					}) as any,
			);

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(true);
			expect(mockWorkflowRepository.get).toHaveBeenCalledTimes(2);
		});

		it('should return invalid when a referenced sub-workflow is not published', async () => {
			const nodes: INode[] = [createExecuteWorkflowNode('Sub-workflow 1', { value: 'workflow-1' })];

			mockWorkflowRepository.get.mockResolvedValue({
				id: 'workflow-1',
				name: 'Draft Workflow',
				activeVersionId: null,
			} as any);

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(false);
			expect(result.error).toContain('Node "Sub-workflow 1" references workflow workflow-1');
			expect(result.error).toContain('("Draft Workflow")');
			expect(result.error).toContain('which is not published');
			expect(result.invalidReferences).toHaveLength(1);
			expect(result.invalidReferences?.[0]).toEqual({
				nodeName: 'Sub-workflow 1',
				workflowId: 'workflow-1',
				workflowName: 'Draft Workflow',
			});
		});

		it('should return invalid when a referenced sub-workflow does not exist', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('Sub-workflow 1', { value: 'non-existent' }),
			];

			mockWorkflowRepository.get.mockResolvedValue(null);

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(false);
			expect(result.invalidReferences?.[0]).toEqual({
				nodeName: 'Sub-workflow 1',
				workflowId: 'non-existent',
				workflowName: undefined,
			});
		});

		it('should skip disabled executeWorkflow nodes', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('Disabled Node', { value: 'workflow-1' }, { disabled: true }),
			];

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(true);
			expect(mockWorkflowRepository.get).not.toHaveBeenCalled();
		});

		it('should skip nodes using expressions for workflowId', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('Expression Node', '={{ $json.workflowId }}'),
			];

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(true);
			expect(mockWorkflowRepository.get).not.toHaveBeenCalled();
		});

		it('should skip nodes using non-database sources', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('URL Node', { value: 'workflow-1' }, { source: 'url' }),
				createExecuteWorkflowNode(
					'Parameter Node',
					{ value: 'workflow-2' },
					{ source: 'parameter' },
				),
				createExecuteWorkflowNode(
					'LocalFile Node',
					{ value: 'workflow-3' },
					{ source: 'localFile' },
				),
			];

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(true);
			expect(mockWorkflowRepository.get).not.toHaveBeenCalled();
		});

		it('should validate nodes using database source', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('Database Node', { value: 'workflow-1' }, { source: 'database' }),
			];

			mockWorkflowRepository.get.mockResolvedValue({
				id: 'workflow-1',
				name: 'Workflow',
				activeVersionId: 'version-id',
			} as any);

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(true);
			expect(mockWorkflowRepository.get).toHaveBeenCalledWith(
				{ id: 'workflow-1' },
				{ relations: [] },
			);
		});

		it('should handle old node format with string workflowId', async () => {
			const nodes: INode[] = [createExecuteWorkflowNode('Old Format Node', 'workflow-1')];

			mockWorkflowRepository.get.mockResolvedValue({
				id: 'workflow-1',
				name: 'Workflow',
				activeVersionId: 'version-id',
			} as any);

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(true);
			expect(mockWorkflowRepository.get).toHaveBeenCalledWith(
				{ id: 'workflow-1' },
				{ relations: [] },
			);
		});

		it('should collect all invalid references in a single validation', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('Sub-workflow 1', { value: 'workflow-1' }),
				createExecuteWorkflowNode('Sub-workflow 2', { value: 'workflow-2' }),
				createExecuteWorkflowNode('Sub-workflow 3', { value: 'workflow-3' }),
			];

			mockWorkflowRepository.get.mockImplementation(async ({ id }) => {
				if (id === 'workflow-2') return undefined;
				return {
					id: id as string,
					name: id === 'workflow-3' ? 'Draft Workflow 3' : 'Workflow',
					activeVersionId: id === 'workflow-1' ? 'version-id' : null,
				} as any;
			});

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(false);
			expect(result.invalidReferences).toHaveLength(2);
			expect(result.error).toContain('workflow-2');
			expect(result.error).toContain('workflow-3');
		});

		it('should allow self-referencing workflows', async () => {
			const nodes: INode[] = [
				createExecuteWorkflowNode('Self Reference', { value: 'parent-workflow-id' }),
			];

			const result = await service.validateSubWorkflowReferences('parent-workflow-id', nodes);

			expect(result.isValid).toBe(true);
			expect(mockWorkflowRepository.get).not.toHaveBeenCalled();
		});
	});

	describe('validateForActivation', () => {
		let mockNodeTypes: ReturnType<typeof mock<NodeTypes>>;

		beforeEach(() => {
			mockNodeTypes = mock<NodeTypes>();
		});

		const createNode = (
			name: string,
			type: string,
			options?: {
				disabled?: boolean;
				credentials?: Record<string, { id: string; name?: string }>;
				parameters?: Record<string, unknown>;
			},
		): INode => ({
			name,
			type,
			id: `node-${name}`,
			typeVersion: 1,
			position: [0, 0],
			disabled: options?.disabled,
			credentials: options?.credentials as any,
			parameters: (options?.parameters as any) || {},
		});

		const createConnections = (connections: Array<[string, string]>): IConnections => {
			const result: IConnections = {};
			connections.forEach(([from, to]) => {
				if (!result[from]) {
					result[from] = { main: [[]] as any };
				}
				if (result[from].main?.[0]) {
					result[from].main[0].push({ node: to, type: 'main', index: 0 });
				}
			});
			return result;
		};

		const createMockNodeType = (
			credentials?: Array<{ name: string; displayName: string; required: boolean }>,
			properties?: Array<{ name: string; required?: boolean }>,
			isTrigger = false,
		): INodeType => {
			const description: INodeTypeDescription = {
				displayName: 'Test Node',
				name: 'testNode',
				group: ['transform'],
				version: 1,
				description: 'Test node',
				defaults: { name: 'Test Node' },
				inputs: ['main'],
				outputs: ['main'],
				properties: (properties || []) as any,
				credentials: credentials || [],
			};

			const nodeType: INodeType = {
				description,
			} as INodeType;

			// Add trigger method if it's a trigger node
			if (isTrigger) {
				nodeType.trigger = async function () {
					return {
						closeFunction: async () => {},
						manualTriggerFunction: async () => {},
					};
				};
			}

			return nodeType;
		};

		it('should return valid for workflow with no connected nodes', () => {
			const nodes = {
				Webhook: createNode('Webhook', 'n8n-nodes-base.webhook'),
			};
			const connections: IConnections = {};

			mockNodeTypes.getByNameAndVersion.mockReturnValue(createMockNodeType([], [], true));

			const result = service.validateForActivation(nodes, connections, mockNodeTypes);

			expect(result.isValid).toBe(true);
		});

		it('should return valid for workflow with all valid connected nodes', () => {
			const nodes = {
				Webhook: createNode('Webhook', 'n8n-nodes-base.webhook'),
				'HTTP Request': createNode('HTTP Request', 'n8n-nodes-base.httpRequest', {
					credentials: { httpAuth: { id: 'cred-1' } },
					parameters: { url: 'https://example.com' },
				}),
			};
			const connections = createConnections([['Webhook', 'HTTP Request']]);

			mockNodeTypes.getByNameAndVersion.mockImplementation(((
				type: string,
			): INodeType | undefined => {
				if (type === 'n8n-nodes-base.webhook') {
					return createMockNodeType([], [], true);
				}
				if (type === 'n8n-nodes-base.httpRequest') {
					return createMockNodeType(
						[{ name: 'httpAuth', displayName: 'HTTP Auth', required: true }],
						[{ name: 'url', required: true }],
					);
				}
				return undefined;
			}) as any);

			const result = service.validateForActivation(nodes, connections, mockNodeTypes);

			expect(result.isValid).toBe(true);
		});

		it('should return invalid when connected node is missing required credential', () => {
			const nodes = {
				Webhook: createNode('Webhook', 'n8n-nodes-base.webhook'),
				Agent: createNode('Agent', 'n8n-nodes-base.agent', {
					parameters: {},
				}),
			};
			const connections = createConnections([['Webhook', 'Agent']]);

			mockNodeTypes.getByNameAndVersion.mockImplementation(((
				type: string,
			): INodeType | undefined => {
				if (type === 'n8n-nodes-base.webhook') {
					return createMockNodeType([], [], true);
				}
				if (type === 'n8n-nodes-base.agent') {
					return createMockNodeType(
						[{ name: 'openAiApi', displayName: 'OpenAI API', required: true }],
						[],
					);
				}
				return undefined;
			}) as any);

			const result = service.validateForActivation(nodes, connections, mockNodeTypes);

			expect(result.isValid).toBe(false);
			expect(result.error).toContain('Cannot publish workflow');
			expect(result.error).toContain('1 node have configuration issues');
			expect(result.error).toContain('Node "Agent"');
			expect(result.error).toContain('Missing required credential: OpenAI API');
		});

		it('should return invalid when connected node has credential without ID', () => {
			const nodes = {
				Webhook: createNode('Webhook', 'n8n-nodes-base.webhook'),
				Agent: createNode('Agent', 'n8n-nodes-base.agent', {
					credentials: { openAiApi: { id: '' } },
					parameters: {},
				}),
			};
			const connections = createConnections([['Webhook', 'Agent']]);

			mockNodeTypes.getByNameAndVersion.mockImplementation(((
				type: string,
			): INodeType | undefined => {
				if (type === 'n8n-nodes-base.webhook') {
					return createMockNodeType([], [], true);
				}
				if (type === 'n8n-nodes-base.agent') {
					return createMockNodeType(
						[{ name: 'openAiApi', displayName: 'OpenAI API', required: true }],
						[],
					);
				}
				return undefined;
			}) as any);

			const result = service.validateForActivation(nodes, connections, mockNodeTypes);

			expect(result.isValid).toBe(false);
			expect(result.error).toContain('Credential not configured: OpenAI API');
		});

		it('should skip validation for disabled nodes', () => {
			const nodes = {
				Webhook: createNode('Webhook', 'n8n-nodes-base.webhook'),
				Agent: createNode('Agent', 'n8n-nodes-base.agent', {
					disabled: true,
					parameters: {},
				}),
			};
			const connections = createConnections([['Webhook', 'Agent']]);

			mockNodeTypes.getByNameAndVersion.mockImplementation(((
				type: string,
			): INodeType | undefined => {
				if (type === 'n8n-nodes-base.webhook') {
					return createMockNodeType([], [], true);
				}
				if (type === 'n8n-nodes-base.agent') {
					return createMockNodeType(
						[{ name: 'openAiApi', displayName: 'OpenAI API', required: true }],
						[],
					);
				}
				return undefined;
			}) as any);

			const result = service.validateForActivation(nodes, connections, mockNodeTypes);

			expect(result.isValid).toBe(true);
		});

		it('should skip validation for disconnected nodes', () => {
			const nodes = {
				Webhook: createNode('Webhook', 'n8n-nodes-base.webhook'),
				Agent: createNode('Agent', 'n8n-nodes-base.agent', {
					parameters: {},
				}),
			};
			// Agent is not connected to anything
			const connections: IConnections = {};

			mockNodeTypes.getByNameAndVersion.mockImplementation(((
				type: string,
			): INodeType | undefined => {
				if (type === 'n8n-nodes-base.webhook') {
					return createMockNodeType([], [], true);
				}
				if (type === 'n8n-nodes-base.agent') {
					return createMockNodeType(
						[{ name: 'openAiApi', displayName: 'OpenAI API', required: true }],
						[],
					);
				}
				return undefined;
			}) as any);

			const result = service.validateForActivation(nodes, connections, mockNodeTypes);

			expect(result.isValid).toBe(true);
		});

		it('should validate multiple nodes with issues', () => {
			const nodes = {
				Webhook: createNode('Webhook', 'n8n-nodes-base.webhook'),
				Agent1: createNode('Agent1', 'n8n-nodes-base.agent', {
					parameters: {},
				}),
				Agent2: createNode('Agent2', 'n8n-nodes-base.agent', {
					parameters: {},
				}),
			};
			const connections = createConnections([
				['Webhook', 'Agent1'],
				['Agent1', 'Agent2'],
			]);

			mockNodeTypes.getByNameAndVersion.mockImplementation(((
				type: string,
			): INodeType | undefined => {
				if (type === 'n8n-nodes-base.webhook') {
					return createMockNodeType([], [], true);
				}
				if (type === 'n8n-nodes-base.agent') {
					return createMockNodeType(
						[{ name: 'openAiApi', displayName: 'OpenAI API', required: true }],
						[],
					);
				}
				return undefined;
			}) as any);

			const result = service.validateForActivation(nodes, connections, mockNodeTypes);

			expect(result.isValid).toBe(false);
			expect(result.error).toContain('2 nodes have configuration issues');
			expect(result.error).toContain('Node "Agent1"');
			expect(result.error).toContain('Node "Agent2"');
		});

		it('should return invalid when node type is not found', () => {
			const nodes = {
				Webhook: createNode('Webhook', 'n8n-nodes-base.webhook'),
				Unknown: createNode('Unknown', 'n8n-nodes-base.unknownNode'),
			};
			const connections = createConnections([['Webhook', 'Unknown']]);

			mockNodeTypes.getByNameAndVersion.mockImplementation(((
				type: string,
			): INodeType | undefined => {
				if (type === 'n8n-nodes-base.webhook') {
					return createMockNodeType([], [], true);
				}
				return undefined;
			}) as any);

			const result = service.validateForActivation(nodes, connections, mockNodeTypes);

			expect(result.isValid).toBe(false);
			expect(result.error).toContain('Node "Unknown"');
			expect(result.error).toContain('Node type not found');
		});

		it('should return invalid when workflow has no trigger node', () => {
			const nodes = {
				Set: createNode('Set', 'n8n-nodes-base.set'),
			};
			const connections: IConnections = {};

			mockNodeTypes.getByNameAndVersion.mockReturnValue(createMockNodeType([], []));

			const result = service.validateForActivation(nodes, connections, mockNodeTypes);

			expect(result.isValid).toBe(false);
			expect(result.error).toContain('no trigger node');
		});

		it('should respect displayOptions when validating credentials', () => {
			// Simulates a Webhook node with authentication parameter set to 'none'
			const nodes = {
				Webhook: createNode('Webhook', 'n8n-nodes-base.webhook', {
					parameters: { authentication: 'none' },
				}),
			};
			const connections: IConnections = {};

			// Mock node type with credentials that have displayOptions
			const nodeType = createMockNodeType([], [], true);
			nodeType.description.credentials = [
				{
					name: 'httpBasicAuth',
					displayName: 'Basic Auth',
					required: true,
					displayOptions: {
						show: {
							authentication: ['basicAuth'],
						},
					},
				},
				{
					name: 'httpHeaderAuth',
					displayName: 'Header Auth',
					required: true,
					displayOptions: {
						show: {
							authentication: ['headerAuth'],
						},
					},
				},
			];

			mockNodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

			const result = service.validateForActivation(nodes, connections, mockNodeTypes);

			// Should be valid because authentication='none', so no credentials are required
			expect(result.isValid).toBe(true);
		});

		it('should validate credentials when displayOptions match', () => {
			// Simulates a Webhook node with authentication='basicAuth' but missing credential
			const nodes = {
				Webhook: createNode('Webhook', 'n8n-nodes-base.webhook', {
					parameters: { authentication: 'basicAuth' },
				}),
			};
			const connections: IConnections = {};

			// Mock node type with credentials that have displayOptions
			const nodeType = createMockNodeType([], [], true);
			nodeType.description.credentials = [
				{
					name: 'httpBasicAuth',
					displayName: 'Basic Auth',
					required: true,
					displayOptions: {
						show: {
							authentication: ['basicAuth'],
						},
					},
				},
			];

			mockNodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

			const result = service.validateForActivation(nodes, connections, mockNodeTypes);

			// Should be invalid because authentication='basicAuth' but no credential is set
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('Missing required credential: Basic Auth');
		});
	});
});
