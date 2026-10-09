import { getGoogleAccessToken } from 'n8n-nodes-base/google-service-account';
import {
	NodeHelpers,
	Workflow,
	type ICredentialsDecrypted,
	type ICredentialTestFunctions,
	type INode,
	type INodeTypes,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { EmbeddingsGoogleVertex } from '../../nodes/embeddings/EmbeddingsGoogleVertex/EmbeddingsGoogleVertex.node';
import { LmChatGoogleVertex } from '../../nodes/llms/LmChatGoogleVertex/LmChatGoogleVertex.node';
import { googleVertexAiCredentialTest } from '../google-vertex';

vi.mock('n8n-nodes-base/google-service-account', async (importOriginal) => ({
	...(await importOriginal<typeof import('n8n-nodes-base/google-service-account')>()),
	getGoogleAccessToken: vi.fn(),
}));

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
					expect(visibleCredentials?.[0].testedBy).toBe('googleVertexAiCredentialTest');
					expect(node.methods.credentialTest.googleVertexAiCredentialTest).toBe(
						googleVertexAiCredentialTest,
					);
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

describe('googleVertexAiCredentialTest', () => {
	const request = vi.fn<ICredentialTestFunctions['helpers']['request']>();
	const context = mock<ICredentialTestFunctions>({
		helpers: mock<ICredentialTestFunctions['helpers']>({ request }),
	});
	const credential = mock<ICredentialsDecrypted>({
		data: {
			email: 'test@example.com',
			privateKey: 'test-private-key',
			projectId: ' test-project ',
			delegatedEmail: 'unused@example.com',
		},
	});

	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(getGoogleAccessToken).mockResolvedValue({ access_token: 'test-access-token' });
		request.mockResolvedValue({ locations: [] });
	});

	it('checks the credential project with Vertex scopes and service account authentication', async () => {
		const result = await googleVertexAiCredentialTest.call(context, credential);

		expect(result.status).toBe('OK');
		expect(getGoogleAccessToken).toHaveBeenCalledWith(
			{ email: 'test@example.com', privateKey: 'test-private-key' },
			'vertex',
		);
		expect(request).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'GET',
				uri: 'https://aiplatform.googleapis.com/v1/projects/test-project/locations',
				headers: { Authorization: 'Bearer test-access-token' },
				qs: { pageSize: 1 },
			}),
		);
	});

	it('reports a project error even when the service account key is valid', async () => {
		request.mockRejectedValue(new Error('Project not found'));

		const result = await googleVertexAiCredentialTest.call(context, credential);

		expect(result).toEqual({
			status: 'Error',
			message: expect.stringContaining('Project not found'),
		});
	});

	it('does not check the project when token exchange fails', async () => {
		vi.mocked(getGoogleAccessToken).mockRejectedValue(new Error('Invalid service account key'));

		const result = await googleVertexAiCredentialTest.call(context, credential);

		expect(result).toEqual({
			status: 'Error',
			message: expect.stringContaining('Invalid service account key'),
		});
		expect(request).not.toHaveBeenCalled();
	});

	it('does not check the project when Google returns no access token', async () => {
		vi.mocked(getGoogleAccessToken).mockResolvedValue({});

		const result = await googleVertexAiCredentialTest.call(context, credential);

		expect(result.status).toBe('Error');
		expect(request).not.toHaveBeenCalled();
	});

	it('rejects an empty project ID before requesting a token', async () => {
		const result = await googleVertexAiCredentialTest.call(context, {
			...credential,
			data: { ...credential.data, projectId: '   ' },
		});

		expect(result.status).toBe('Error');
		expect(getGoogleAccessToken).not.toHaveBeenCalled();
	});
});
