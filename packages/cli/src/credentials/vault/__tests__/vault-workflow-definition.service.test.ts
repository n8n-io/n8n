import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';

import { VaultWorkflowDefinitionService } from '../vault-workflow-definition.service';

describe('VaultWorkflowDefinitionService', () => {
	const nodeTypes = mock<NodeTypes>();
	const workflowRepository = mock<WorkflowRepository>();

	// A node type like the GitHub node: `authentication` and `includeOther` have defaults.
	const description = {
		name: 'n8n-nodes-base.example',
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{ name: 'Access Token', value: 'accessToken' },
					{ name: 'OAuth2', value: 'oAuth2' },
				],
				default: 'accessToken',
			},
			{ displayName: 'URL', name: 'url', type: 'string', default: '' },
			{
				displayName: 'Include other fields',
				name: 'includeOther',
				type: 'boolean',
				default: false,
			},
		],
	} as unknown as INodeTypeDescription;

	const node = (parameters: INode['parameters'], extra: Partial<INode> = {}): INode => ({
		id: 'n1',
		name: 'Call',
		type: 'n8n-nodes-base.example',
		typeVersion: 1,
		position: [0, 0],
		parameters,
		...extra,
	});

	let service: VaultWorkflowDefinitionService;

	beforeEach(() => {
		vi.resetAllMocks();
		nodeTypes.getByNameAndVersion.mockReturnValue({ description } as never);
		service = new VaultWorkflowDefinitionService(nodeTypes, workflowRepository);
	});

	describe('normalize', () => {
		it('gives one form whether the defaults are spelled out or left out', () => {
			const spelledOut = node({
				authentication: 'accessToken',
				url: 'https://api.test',
				includeOther: false,
			});
			const editorSaved = node({ url: 'https://api.test' });

			const [a] = service.normalize({ nodes: [spelledOut], connections: {} }).nodes;
			const [b] = service.normalize({ nodes: [editorSaved], connections: {} }).nodes;

			expect(a.parameters).toEqual(b.parameters);
			expect(a.parameters).toEqual({ url: 'https://api.test' });
		});

		it('keeps a value that is not the default', () => {
			const [changed] = service.normalize({
				nodes: [node({ authentication: 'oAuth2', url: 'https://api.test' })],
				connections: {},
			}).nodes;

			expect(changed.parameters).toEqual({ authentication: 'oAuth2', url: 'https://api.test' });
		});

		it('still tells two different workflows apart', () => {
			const [before] = service.normalize({
				nodes: [node({ url: 'https://api.test' })],
				connections: {},
			}).nodes;
			const [after] = service.normalize({
				nodes: [node({ url: 'https://attacker.test' })],
				connections: {},
			}).nodes;

			expect(before.parameters).not.toEqual(after.parameters);
		});

		it('leaves the rest of the node and the connections as they are', () => {
			const connections = { Call: { main: [[{ node: 'Next', type: 'main' as const, index: 0 }]] } };
			const original = node({ url: 'https://api.test' }, { disabled: true });

			const result = service.normalize({ nodes: [original], connections });

			expect(result.connections).toBe(connections);
			expect(result.nodes[0]).toMatchObject({ id: 'n1', name: 'Call', disabled: true });
		});

		it('keeps the stored parameters of a node type that is not installed', () => {
			nodeTypes.getByNameAndVersion.mockImplementation(() => {
				throw new Error('Unrecognized node type');
			});
			const stored = node({ url: 'https://api.test', authentication: 'accessToken' });

			const [result] = service.normalize({ nodes: [stored], connections: {} }).nodes;

			expect(result.parameters).toEqual({ url: 'https://api.test', authentication: 'accessToken' });
		});
	});

	describe('load', () => {
		it('returns the draft and the published version, both normalized', async () => {
			workflowRepository.findById.mockResolvedValue({
				id: 'wf1',
				versionId: 'draft-1',
				nodes: [node({ url: 'https://draft.test', authentication: 'accessToken' })],
				connections: {},
				activeVersion: {
					versionId: 'active-1',
					nodes: [node({ url: 'https://published.test' })],
					connections: {},
				},
			} as unknown as WorkflowEntity);

			const result = await service.load('wf1');

			expect(result).toMatchObject({
				workflowId: 'wf1',
				draftVersionId: 'draft-1',
				activeVersionId: 'active-1',
			});
			expect(result?.draft.nodes[0].parameters).toEqual({ url: 'https://draft.test' });
			expect(result?.active?.nodes[0].parameters).toEqual({ url: 'https://published.test' });
		});

		it('has no published version for a workflow that is not published', async () => {
			workflowRepository.findById.mockResolvedValue({
				id: 'wf1',
				versionId: 'draft-1',
				nodes: [node({})],
				connections: {},
				activeVersion: null,
			} as unknown as WorkflowEntity);

			const result = await service.load('wf1');

			expect(result?.active).toBeNull();
			expect(result?.activeVersionId).toBeNull();
		});

		it('returns nothing for a workflow that does not exist', async () => {
			workflowRepository.findById.mockResolvedValue(null);

			await expect(service.load('missing')).resolves.toBeNull();
		});
	});
});
