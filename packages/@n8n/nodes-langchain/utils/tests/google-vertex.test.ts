import { googleApiCredentialTest } from 'n8n-nodes-base/google-service-account';
import { NodeHelpers, Workflow, type INode, type INodeTypes } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { EmbeddingsGoogleVertex } from '../../nodes/embeddings/EmbeddingsGoogleVertex/EmbeddingsGoogleVertex.node';
import { LmChatGoogleVertex } from '../../nodes/llms/LmChatGoogleVertex/LmChatGoogleVertex.node';
import { searchGoogleProjects } from '../google-vertex';

const { searchProjects, close, ProjectsClient } = vi.hoisted(() => {
	const searchProjects = vi.fn();
	const close = vi.fn();
	return {
		searchProjects,
		close,
		ProjectsClient: vi.fn(
			class {
				searchProjects = searchProjects;
				close = close;
			},
		),
	};
});

vi.mock('@google-cloud/resource-manager', () => ({ ProjectsClient }));

describe('Google project discovery', () => {
	const credentials = Object.freeze({
		email: ' service@owner-project.iam.gserviceaccount.com ',
		privateKey: '-----BEGIN PRIVATE KEY----- key -----END PRIVATE KEY-----',
		region: 'eu',
	});

	beforeEach(() => vi.clearAllMocks());

	it('normalizes the service account and returns project names, IDs, and the next page', async () => {
		searchProjects.mockResolvedValue([
			[
				{ displayName: 'Target project', projectId: 'target-project' },
				{ projectId: 'another-project' },
				{ displayName: 'Missing ID' },
			],
			{ pageToken: 'next-page' },
		]);

		await expect(searchGoogleProjects(credentials, undefined, 'current-page')).resolves.toEqual({
			results: [
				{ name: 'Target project (target-project)', value: 'target-project' },
				{ name: 'another-project', value: 'another-project' },
			],
			paginationToken: 'next-page',
		});
		expect(ProjectsClient).toHaveBeenCalledWith({
			credentials: {
				client_email: 'service@owner-project.iam.gserviceaccount.com',
				private_key: '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----',
			},
		});
		expect(searchProjects).toHaveBeenCalledWith(
			{ pageToken: 'current-page' },
			{ autoPaginate: false },
		);
		expect(close).toHaveBeenCalled();
	});

	it('closes the client when project discovery fails', async () => {
		searchProjects.mockRejectedValue(new Error('Permission denied'));

		await expect(searchGoogleProjects(credentials)).rejects.toThrow('Permission denied');
		expect(close).toHaveBeenCalled();
	});
});

describe.each([new LmChatGoogleVertex(), new EmbeddingsGoogleVertex()])(
	'$description.displayName credential selection',
	(node) => {
		it.each([undefined, 'googleApi', 'googleVertexAiApi'])(
			'keeps the project field and credentials consistent for authentication %s',
			(authentication) => {
				const description = node.description;
				const savedNode: INode = {
					id: 'vertex-node',
					name: 'Vertex',
					type: description.name,
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						...(authentication ? { authentication } : {}),
						projectId: { __rl: true, mode: 'id', value: '={{ "legacy-project" }}' },
					},
				};
				const workflow = new Workflow({
					nodes: [savedNode],
					connections: {},
					active: false,
					nodeTypes: mock<INodeTypes>({ getByNameAndVersion: () => node }),
				});
				const parameters = workflow.nodes.Vertex.parameters;
				const visibleCredentials = description.credentials?.filter((credential) =>
					NodeHelpers.displayParameter(parameters, credential, null, description),
				);
				expect(visibleCredentials?.map((credential) => credential.name)).toEqual([
					authentication ?? 'googleApi',
				]);
				if (authentication === 'googleVertexAiApi') {
					expect(visibleCredentials?.[0].testedBy).toBe('googleApiCredentialTest');
					expect(node.methods.credentialTest.googleApiCredentialTest).toBeTypeOf('function');
					expect(node.methods.credentialTest.googleApiCredentialTest).toBe(googleApiCredentialTest);
				}
				const projectField = description.properties.find(
					(property) => property.name === 'projectId',
				)!;
				expect(NodeHelpers.displayParameter(parameters, projectField, null, description)).toBe(
					authentication !== 'googleVertexAiApi',
				);
				if (authentication !== 'googleVertexAiApi') {
					expect(
						workflow.expression.getComplexParameterValue(savedNode, parameters, 'manual', {}),
					).toMatchObject({ projectId: { value: 'legacy-project' } });
				}
			},
		);
	},
);
