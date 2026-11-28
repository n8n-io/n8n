import { getGoogleAccessToken } from 'n8n-nodes-base/google-service-account';
import {
	NodeHelpers,
	requestUrl,
	Workflow,
	type ICredentialsDecrypted,
	type ICredentialTestFunctions,
	type INode,
	type INodeTypes,
	type ISupplyDataFunctions,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { EmbeddingsGoogleVertex } from '../../nodes/embeddings/EmbeddingsGoogleVertex/EmbeddingsGoogleVertex.node';
import { LmChatGoogleVertex } from '../../nodes/llms/LmChatGoogleVertex/LmChatGoogleVertex.node';
import {
	googleVertexAiCredentialTest,
	resolveGoogleVertexCredentials,
	searchGoogleProjects,
} from '../google-vertex';

vi.mock('n8n-nodes-base/google-service-account', async (importOriginal) => ({
	...(await importOriginal<typeof import('n8n-nodes-base/google-service-account')>()),
	getGoogleAccessToken: vi.fn(),
}));

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

describe('Google Vertex credential project', () => {
	it.each([
		{ project: undefined, projectId: 'saved-project', expected: 'saved-project' },
		{ project: '__custom__', projectId: 'manual-project', expected: 'manual-project' },
		{ project: 'selected-project', projectId: 'old-manual-project', expected: 'selected-project' },
	])('uses project $expected for selector $project', async ({ project, projectId, expected }) => {
		const context = mock<ISupplyDataFunctions>();
		context.getCredentials.mockResolvedValue({
			email: 'service@example.com',
			privateKey: 'test-key',
			region: 'global',
			...(project === undefined ? {} : { project }),
			projectId,
		});
		context.getNodeParameter.mockImplementation((name) =>
			name === 'authentication' ? 'googleVertexAiApi' : '',
		);
		await expect(resolveGoogleVertexCredentials(context, 0)).resolves.toMatchObject({
			projectId: expected,
		});
	});
});

describe('Google project discovery', () => {
	const credentials = Object.freeze({
		email: ' service@owner-project.iam.gserviceaccount.com ',
		privateKey: '-----BEGIN PRIVATE KEY----- key -----END PRIVATE KEY-----',
		region: 'eu',
	});

	beforeEach(() => vi.clearAllMocks());

	it.each([
		{ filter: undefined, expectedRequest: { pageToken: 'current-page' } },
		{ filter: '', expectedRequest: { pageToken: 'current-page' } },
		{ filter: ' \t\n ', expectedRequest: { pageToken: 'current-page' } },
		{
			filter: 'target',
			expectedRequest: {
				pageToken: 'current-page',
				query: 'displayName:"target*" projectId:"target*"',
			},
		},
		{
			filter: ' Target "project"\\folder ',
			expectedRequest: {
				pageToken: 'current-page',
				query:
					'displayName:"Target \\"project\\"\\\\folder*" projectId:"Target \\"project\\"\\\\folder*"',
			},
		},
	])('returns projects and pagination for filter $filter', async ({ filter, expectedRequest }) => {
		searchProjects.mockResolvedValue([
			[
				{ displayName: 'Target project', projectId: 'target-project' },
				{ projectId: 'another-project' },
				{ displayName: 'Missing ID' },
			],
			{ pageToken: 'next-page' },
		]);

		await expect(searchGoogleProjects(credentials, filter, 'current-page')).resolves.toEqual({
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
		expect(searchProjects).toHaveBeenCalledWith(expectedRequest, { autoPaginate: false });
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
	const credential: ICredentialsDecrypted = {
		id: 'vertex-credential',
		name: 'Google Vertex AI',
		type: 'googleVertexAiApi',
		data: {
			email: 'test@example.com',
			privateKey: 'test-private-key',
			projectId: ' test-project ',
			delegatedEmail: 'unused@example.com',
		},
	};

	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(getGoogleAccessToken).mockResolvedValue({ access_token: 'test-access-token' });
		request.mockResolvedValue({ locations: [] });
	});

	it.each([
		{ project: undefined, projectId: ' test-project ', expected: 'test-project' },
		{ project: '__custom__', projectId: ' manual-project ', expected: 'manual-project' },
		{
			project: ' selected-project ',
			projectId: 'old-manual-project',
			expected: 'selected-project',
		},
	])(
		'checks project $expected with Vertex scopes and service account authentication',
		async ({ project, projectId, expected }) => {
			const result = await googleVertexAiCredentialTest.call(context, {
				...credential,
				data: {
					...credential.data,
					...(project === undefined ? {} : { project }),
					projectId,
				},
			});

			expect(result.status).toBe('OK');
			expect(getGoogleAccessToken).toHaveBeenCalledWith(
				{ email: 'test@example.com', privateKey: 'test-private-key' },
				'vertex',
			);
			expect(request).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					uri: requestUrl`https://aiplatform.googleapis.com/v1/projects/${expected}/locations`,
					headers: { Authorization: 'Bearer test-access-token' },
					qs: { pageSize: 1 },
				}),
			);
		},
	);

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

describe('Vertex region restrictions', () => {
	const buildContext = (credentials: Record<string, unknown>, locationOverride: string) => {
		const context = mock<ISupplyDataFunctions>();
		context.getNode.mockReturnValue(mock<INode>({ name: 'Google Vertex Chat Model' }));
		context.getCredentials.mockResolvedValue({
			email: 'service@example.com',
			privateKey: 'test-key',
			region: 'us-central1',
			...credentials,
		});
		context.getNodeParameter.mockImplementation((name) => {
			if (name === 'authentication') return 'googleApi';
			if (name === 'location') return locationOverride;
			return 'some-project';
		});
		return context;
	};

	// The Region field is `type: 'options'`, but a stored workflow can carry any
	// string, and the value lands in the request authority. The shape check has to
	// hold on its own, because `all` is the default restriction mode.
	it.each([
		'elsewhere.example/',
		'evil.example',
		'us-central1:8443',
		'user@evil.example',
		'us-central1/../..',
	])('refuses the region %j even when the credential allows every domain', async (location) => {
		const context = buildContext({ allowedHttpRequestDomains: 'all' }, location);

		await expect(resolveGoogleVertexCredentials(context, 0)).rejects.toThrow(
			'is not a valid Vertex region',
		);
	});

	it.each(['global', 'eu', 'us', 'us-central1', 'europe-west4'])(
		'allows the region %j',
		async (location) => {
			const context = buildContext({ allowedHttpRequestDomains: 'all' }, location);

			await expect(resolveGoogleVertexCredentials(context, 0)).resolves.toMatchObject({
				location,
			});
		},
	);

	// The credential's own region is the baseline the credential already grants. `domains`
	// mode does not read `pinnedUrl`, so checking it there rejected a credential for the very
	// endpoint its owner configured, and `none` mode allowed what `domains` refused.
	it.each([
		['the field default', ''],
		['the credential region named explicitly', 'europe-west2'],
	])('allows the credential region with %s, though the list omits it', async (_label, override) => {
		const context = buildContext(
			{
				region: 'europe-west2',
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'oauth2.googleapis.com, aiplatform.googleapis.com',
			},
			override,
		);

		await expect(resolveGoogleVertexCredentials(context, 0)).resolves.toMatchObject({
			location: 'europe-west2',
		});
	});

	it('still refuses an override away from the credential region', async () => {
		const context = buildContext(
			{
				region: 'europe-west2',
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'oauth2.googleapis.com, aiplatform.googleapis.com',
			},
			'us-central1',
		);

		await expect(resolveGoogleVertexCredentials(context, 0)).rejects.toThrow(/not allowed/i);
	});

	it('refuses a region whose host is outside the allowed domains', async () => {
		const context = buildContext(
			{
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'us-central1-aiplatform.googleapis.com',
			},
			'europe-west4',
		);

		await expect(resolveGoogleVertexCredentials(context, 0)).rejects.toThrow(/not allowed/i);
	});

	it('allows a region whose host is on the allowed domains', async () => {
		const context = buildContext(
			{
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'europe-west4-aiplatform.googleapis.com',
			},
			'europe-west4',
		);

		await expect(resolveGoogleVertexCredentials(context, 0)).resolves.toMatchObject({
			location: 'europe-west4',
		});
	});

	// `none` pins to the credential's own region rather than blocking outright, so
	// the credential still works where it was configured to.
	it('allows the credential region when the credential blocks every domain', async () => {
		const context = buildContext({ allowedHttpRequestDomains: 'none', region: 'us-central1' }, '');

		await expect(resolveGoogleVertexCredentials(context, 0)).resolves.toMatchObject({
			location: 'us-central1',
		});
	});

	it('refuses an override away from the credential region when the credential blocks every domain', async () => {
		const context = buildContext(
			{ allowedHttpRequestDomains: 'none', region: 'us-central1' },
			'europe-west4',
		);

		await expect(resolveGoogleVertexCredentials(context, 0)).rejects.toThrow(/not allowed/i);
	});

	// The multi-region locations are served from `aiplatform.<loc>.rep.googleapis.com`,
	// so an allowlist naming the bare host does not reach them. That configuration was
	// always wrong; it just was not enforced on this path before.
	it.each(['eu', 'us'])(
		'refuses the multi-region %j when only the bare aiplatform host is allowed',
		async (location) => {
			const context = buildContext(
				{
					allowedHttpRequestDomains: 'domains',
					allowedDomains: 'aiplatform.googleapis.com',
				},
				location,
			);

			await expect(resolveGoogleVertexCredentials(context, 0)).rejects.toThrow(/not allowed/i);
		},
	);

	// Allowlisting the exact `.rep.` host is what proves the resolver asks the
	// allowlist about the host the SDK really calls. A regional-shaped host would
	// fail this, where the bare-host and wildcard cases above would not notice.
	it.each([
		['eu', 'aiplatform.eu.rep.googleapis.com'],
		['us', 'aiplatform.us.rep.googleapis.com'],
	])('checks the multi-region %j against its .rep. host', async (location, host) => {
		const allowed = buildContext(
			{ allowedHttpRequestDomains: 'domains', allowedDomains: host },
			location,
		);
		await expect(resolveGoogleVertexCredentials(allowed, 0)).resolves.toMatchObject({ location });

		// The regional shape for the same location must not be what gets checked.
		const regional = buildContext(
			{
				allowedHttpRequestDomains: 'domains',
				allowedDomains: `${location}-aiplatform.googleapis.com`,
			},
			location,
		);
		await expect(resolveGoogleVertexCredentials(regional, 0)).rejects.toThrow(/not allowed/i);
	});

	it.each(['global', 'eu', 'us', 'europe-west4'])(
		'allows the region %j under a wildcard that covers both host shapes',
		async (location) => {
			const context = buildContext(
				{ allowedHttpRequestDomains: 'domains', allowedDomains: '*.googleapis.com' },
				location,
			);

			await expect(resolveGoogleVertexCredentials(context, 0)).resolves.toMatchObject({
				location,
			});
		},
	);
});
