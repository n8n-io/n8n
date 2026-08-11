import type { Mocked } from 'vitest';
import type { Logger } from '@n8n/backend-common';
import type { ProjectRepository, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { NodeTypes } from '@/node-types';
import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { NodeResourceExplorerService } from '@/services/node-resource-explorer.service';

vi.mock('@/workflow-execute-additional-data', () => ({
	getBase: vi.fn().mockResolvedValue({ additional: 'data' }),
}));

describe('NodeResourceExplorerService', () => {
	const user = mock<User>({ id: 'user-1' });

	let logger: Mocked<Logger>;
	let dynamicNodeParametersService: Mocked<DynamicNodeParametersService>;
	let credentialsFinderService: Mocked<CredentialsFinderService>;
	let projectRepository: Mocked<ProjectRepository>;
	let nodeTypes: Mocked<NodeTypes>;
	let service: NodeResourceExplorerService;

	beforeEach(() => {
		vi.clearAllMocks();
		logger = mock<Logger>();
		dynamicNodeParametersService = mock<DynamicNodeParametersService>();
		credentialsFinderService = mock<CredentialsFinderService>();
		projectRepository = mock<ProjectRepository>();
		nodeTypes = mock<NodeTypes>();
		projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue({ id: 'proj-1' } as never);

		service = new NodeResourceExplorerService(
			logger,
			dynamicNodeParametersService,
			credentialsFinderService,
			projectRepository,
			nodeTypes,
		);
	});

	const baseParams = {
		nodeType: 'n8n-nodes-base.slack',
		version: 2.3,
		methodName: 'getChannels',
		methodType: 'listSearch' as const,
		credentialType: 'slackApi',
		credentialId: 'cred-1',
	};

	function mockCredentialOwned(
		overrides: Partial<{ id: string; type: string; name: string }> = {},
	) {
		credentialsFinderService.findCredentialForUser.mockResolvedValue({
			id: 'cred-1',
			type: 'slackApi',
			name: 'My Slack',
			...overrides,
		} as never);
	}

	function mockNodeDescription(description: Partial<INodeTypeDescription>) {
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: description as INodeTypeDescription,
		} as never);
	}

	test('rejects when the credential is not accessible to the user', async () => {
		credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

		await expect(service.exploreResources(user, baseParams)).rejects.toThrow(
			'Credential cred-1 not found or not accessible',
		);

		expect(dynamicNodeParametersService.getResourceLocatorResults).not.toHaveBeenCalled();
		expect(dynamicNodeParametersService.getOptionsViaMethodName).not.toHaveBeenCalled();
	});

	test('does not look up the personal project when the credential check fails', async () => {
		credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

		await expect(service.exploreResources(user, baseParams)).rejects.toThrow();

		expect(projectRepository.getPersonalProjectForUserOrFail).not.toHaveBeenCalled();
	});

	test('rejects when the credential type does not match the requested type', async () => {
		mockCredentialOwned({ type: 'someOtherApi' });

		await expect(service.exploreResources(user, baseParams)).rejects.toThrow(
			'Credential cred-1 not found or not accessible',
		);
	});

	test("does not mutate the caller's currentNodeParameters when auto-filling authentication", async () => {
		mockCredentialOwned({ type: 'googleSheetsOAuth2Api' });
		mockNodeDescription({
			properties: [
				{
					name: 'authentication',
					displayName: 'Auth',
					type: 'options',
					default: '',
					options: [{ name: 'OAuth2', value: 'oAuth2' }],
				},
			] as never,
			credentials: [
				{
					name: 'googleSheetsOAuth2Api',
					displayOptions: { show: { authentication: ['oAuth2'] } },
				},
			] as never,
		});
		dynamicNodeParametersService.getResourceLocatorResults.mockResolvedValue({
			results: [],
		} as never);

		const callerParams = { documentId: 'sheet-1' };
		await service.exploreResources(user, {
			...baseParams,
			credentialType: 'googleSheetsOAuth2Api',
			currentNodeParameters: callerParams,
		});

		expect(callerParams).toEqual({ documentId: 'sheet-1' });
	});

	test('listSearch path: calls getResourceLocatorResults with mapped credentials and params', async () => {
		mockCredentialOwned({ name: 'Resolved' });
		nodeTypes.getByNameAndVersion.mockImplementation(() => {
			throw new Error('not loaded');
		});
		dynamicNodeParametersService.getResourceLocatorResults.mockResolvedValue({
			results: [{ name: 'general', value: 'C1', url: 'https://x' }],
			paginationToken: 'next',
		} as never);

		const result = await service.exploreResources(user, {
			...baseParams,
			filter: 'gen',
			paginationToken: 'prev',
		});

		expect(dynamicNodeParametersService.getResourceLocatorResults).toHaveBeenCalledWith(
			'getChannels',
			'',
			{ additional: 'data' },
			{ name: 'n8n-nodes-base.slack', version: 2.3 },
			expect.any(Object),
			{ slackApi: { id: 'cred-1', name: 'Resolved' } },
			'gen',
			'prev',
		);
		expect(result).toEqual({
			results: [{ name: 'general', value: 'C1', url: 'https://x' }],
			paginationToken: 'next',
		});
	});

	test('loadOptions path: calls getOptionsViaMethodName and maps description through', async () => {
		mockCredentialOwned();
		nodeTypes.getByNameAndVersion.mockImplementation(() => {
			throw new Error('not loaded');
		});
		dynamicNodeParametersService.getOptionsViaMethodName.mockResolvedValue([
			{ name: 'GPT-4', value: 'gpt-4', description: 'flagship' },
			{ name: 'GPT-3.5', value: 'gpt-3.5' },
		] as never);

		const result = await service.exploreResources(user, {
			...baseParams,
			methodType: 'loadOptions',
			methodName: 'listModels',
		});

		expect(dynamicNodeParametersService.getOptionsViaMethodName).toHaveBeenCalled();
		expect(result).toEqual({
			results: [
				{ name: 'GPT-4', value: 'gpt-4', description: 'flagship' },
				{ name: 'GPT-3.5', value: 'gpt-3.5', description: undefined },
			],
		});
	});

	test('auto-detects authentication parameter when the node uses one and caller did not set it', async () => {
		mockCredentialOwned({ type: 'googleSheetsOAuth2Api' });
		mockNodeDescription({
			properties: [
				{
					name: 'authentication',
					displayName: 'Auth',
					type: 'options',
					default: '',
					options: [
						{ name: 'OAuth2', value: 'oAuth2' },
						{ name: 'Service Account', value: 'serviceAccount' },
					],
				},
			] as never,
			credentials: [
				{
					name: 'googleSheetsOAuth2Api',
					displayOptions: { show: { authentication: ['oAuth2'] } },
				},
				{
					name: 'googleApi',
					displayOptions: { show: { authentication: ['serviceAccount'] } },
				},
			] as never,
		});
		dynamicNodeParametersService.getResourceLocatorResults.mockResolvedValue({
			results: [],
		} as never);

		await service.exploreResources(user, {
			...baseParams,
			credentialType: 'googleSheetsOAuth2Api',
		});

		const calledNodeParameters =
			dynamicNodeParametersService.getResourceLocatorResults.mock.calls[0][4];
		expect(calledNodeParameters).toMatchObject({ authentication: 'oAuth2' });
	});

	test('does not overwrite an explicit authentication parameter from the caller', async () => {
		mockCredentialOwned({ type: 'googleSheetsOAuth2Api' });
		mockNodeDescription({
			properties: [
				{
					name: 'authentication',
					displayName: 'Auth',
					type: 'options',
					default: '',
					options: [{ name: 'OAuth2', value: 'oAuth2' }],
				},
			] as never,
			credentials: [
				{
					name: 'googleSheetsOAuth2Api',
					displayOptions: { show: { authentication: ['oAuth2'] } },
				},
			] as never,
		});
		dynamicNodeParametersService.getResourceLocatorResults.mockResolvedValue({
			results: [],
		} as never);

		await service.exploreResources(user, {
			...baseParams,
			credentialType: 'googleSheetsOAuth2Api',
			currentNodeParameters: { authentication: 'preserved' },
		});

		const calledNodeParameters =
			dynamicNodeParametersService.getResourceLocatorResults.mock.calls[0][4];
		expect(calledNodeParameters).toMatchObject({ authentication: 'preserved' });
	});

	test('returns builderHint when the method is referenced by a property with @builderHint.propertyHint', async () => {
		mockCredentialOwned();
		mockNodeDescription({
			properties: [
				{
					name: 'channel',
					displayName: 'Channel',
					type: 'resourceLocator',
					default: '',
					modes: [
						{
							name: 'list',
							displayName: 'From List',
							type: 'list',
							typeOptions: { searchListMethod: 'getChannels' },
						},
					],
					builderHint: { propertyHint: 'Prefer the #general channel for announcements.' },
				},
			] as never,
		});
		dynamicNodeParametersService.getResourceLocatorResults.mockResolvedValue({
			results: [],
		} as never);

		const result = await service.exploreResources(user, baseParams);

		expect(result.builderHint).toBe('Prefer the #general channel for announcements.');
	});

	test('returns no builderHint when the method is unknown or no hint defined', async () => {
		mockCredentialOwned();
		mockNodeDescription({ properties: [] as never });
		dynamicNodeParametersService.getResourceLocatorResults.mockResolvedValue({
			results: [],
		} as never);

		const result = await service.exploreResources(user, baseParams);

		expect(result.builderHint).toBeUndefined();
	});

	test('logs and rethrows when the underlying method call fails', async () => {
		mockCredentialOwned();
		nodeTypes.getByNameAndVersion.mockImplementation(() => {
			throw new Error('not loaded');
		});
		dynamicNodeParametersService.getResourceLocatorResults.mockRejectedValue(
			new Error('Slack API rate-limited'),
		);

		await expect(service.exploreResources(user, baseParams)).rejects.toThrow(
			'Slack API rate-limited',
		);
		expect(logger.error).toHaveBeenCalledWith(
			'Failed to load options for explore-resources',
			expect.objectContaining({ error: 'Slack API rate-limited' }),
		);
	});
	describe('findUnavailableResourceLocatorValues', () => {
		const modelLocator = {
			displayName: 'Model',
			name: 'model',
			type: 'resourceLocator',
			default: { mode: 'list', value: 'gpt-5-mini' },
			modes: [{ name: 'list', type: 'list', typeOptions: { searchListMethod: 'searchModels' } }],
		};

		const openAiParams = {
			nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.3,
			credentialType: 'openAiApi',
			credentialId: 'cred-1',
		};

		function mockAiNode(properties: unknown[]) {
			mockNodeDescription({
				name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				properties: properties as INodeTypeDescription['properties'],
			});
		}

		function mockAvailableModels(ids: string[], paginationToken?: string) {
			dynamicNodeParametersService.getResourceLocatorResults.mockResolvedValue({
				results: ids.map((id) => ({ name: id, value: id })),
				...(paginationToken ? { paginationToken } : {}),
			} as never);
		}

		beforeEach(() => {
			mockCredentialOwned({ type: 'openAiApi', name: 'n8n free OpenAI API credits' });
		});

		test('ignores a same-named non-locator sibling and probes the locator', async () => {
			// lmChatOpenAi declares `model` twice: a legacy `options` field for old type
			// versions and the resource locator for current ones. Only the locator carries a
			// search method, so it is the only one whose value can be checked.
			mockAiNode([
				{ displayName: 'Model', name: 'model', type: 'options', default: 'gpt-5-mini' },
				modelLocator,
			]);
			mockAvailableModels(['gpt-5-mini']);

			const result = await service.findUnavailableResourceLocatorValues(user, {
				...openAiParams,
				parameters: { model: { __rl: true, mode: 'list', value: 'gpt-5.4' } },
			});

			expect(result).toHaveLength(1);
			expect(dynamicNodeParametersService.getResourceLocatorResults).toHaveBeenCalledTimes(1);
			expect(dynamicNodeParametersService.getResourceLocatorResults.mock.calls[0]?.[0]).toBe(
				'searchModels',
			);
		});

		test('reports a model the credential cannot reach', async () => {
			mockAiNode([modelLocator]);
			mockAvailableModels(['gpt-5-mini', 'gpt-4.1-mini']);

			const result = await service.findUnavailableResourceLocatorValues(user, {
				...openAiParams,
				parameters: { model: { __rl: true, mode: 'list', value: 'gpt-5.4' } },
			});

			expect(result).toEqual([{ name: 'model', displayName: 'Model', currentValue: 'gpt-5.4' }]);
		});

		test('reports nothing when the current model is reachable', async () => {
			mockAiNode([modelLocator]);
			mockAvailableModels(['gpt-5-mini', 'gpt-4.1-mini']);

			const result = await service.findUnavailableResourceLocatorValues(user, {
				...openAiParams,
				parameters: { model: { __rl: true, mode: 'list', value: 'gpt-5-mini' } },
			});

			expect(result).toEqual([]);
		});

		test('reports an id-mode value too, since it stores the identifier', async () => {
			// A model the credential can't call is unusable whether it was picked from the
			// dropdown or typed in — this is the shape INS-966 reproduces with.
			mockAiNode([modelLocator]);
			mockAvailableModels(['gpt-5-mini', 'gpt-4.1-mini']);

			const result = await service.findUnavailableResourceLocatorValues(user, {
				...openAiParams,
				parameters: { model: { __rl: true, mode: 'id', value: 'gpt-6-mini' } },
			});

			expect(result).toHaveLength(1);
			expect(result[0]?.currentValue).toBe('gpt-6-mini');
		});

		test('skips an expression, which has no single value to look up', async () => {
			// Mirrors validateResourceLocatorParameter: a value starting with `=` resolves per
			// item at runtime. Reporting it would invite replacing a deliberate dynamic model
			// with a static one.
			mockAiNode([modelLocator]);
			mockAvailableModels(['gpt-5-mini']);

			const result = await service.findUnavailableResourceLocatorValues(user, {
				...openAiParams,
				parameters: { model: { __rl: true, mode: 'id', value: '={{ $json.model }}' } },
			});

			expect(result).toEqual([]);
			expect(dynamicNodeParametersService.getResourceLocatorResults).not.toHaveBeenCalled();
		});

		test('skips an expression in list mode too', async () => {
			mockAiNode([modelLocator]);
			mockAvailableModels(['gpt-5-mini']);

			const result = await service.findUnavailableResourceLocatorValues(user, {
				...openAiParams,
				parameters: {
					model: { __rl: true, mode: 'list', value: '={{ $json.chosenModel }}' },
				},
			});

			expect(result).toEqual([]);
		});

		test('skips an expression stored as a bare string', async () => {
			mockAiNode([modelLocator]);
			mockAvailableModels(['gpt-5-mini']);

			const result = await service.findUnavailableResourceLocatorValues(user, {
				...openAiParams,
				parameters: { model: '={{ $json.model }}' },
			});

			expect(result).toEqual([]);
		});

		test('skips a url-mode value, whose stored value is a URL rather than an id', async () => {
			mockAiNode([modelLocator]);
			mockAvailableModels(['gpt-5-mini']);

			const result = await service.findUnavailableResourceLocatorValues(user, {
				...openAiParams,
				parameters: {
					model: { __rl: true, mode: 'url', value: 'https://example.test/models/custom' },
				},
			});

			expect(result).toEqual([]);
		});

		test('reads a bare string as the identifier as well', async () => {
			mockAiNode([{ ...modelLocator, default: 'gpt-5-mini' }]);
			mockAvailableModels(['gpt-5-mini']);

			const result = await service.findUnavailableResourceLocatorValues(user, {
				...openAiParams,
				parameters: { model: 'gpt-4o' },
			});

			expect(result).toHaveLength(1);
			expect(result[0]?.currentValue).toBe('gpt-4o');
		});

		test('probes only the locator visible for the current resource/operation', async () => {
			// The OpenAI node's modelRLC yields one `modelId` locator per operation, each with a
			// different search method. Without a visibility filter all of them get probed, and
			// the active value is judged against another branch's list.
			mockNodeDescription({
				name: '@n8n/n8n-nodes.openAi',
				properties: [
					{ displayName: 'Resource', name: 'resource', type: 'options', default: 'text' },
					{ displayName: 'Operation', name: 'operation', type: 'options', default: 'message' },
					{
						...modelLocator,
						name: 'modelId',
						modes: [
							{ name: 'list', type: 'list', typeOptions: { searchListMethod: 'modelSearch' } },
						],
						displayOptions: { show: { resource: ['text'], operation: ['message'] } },
					},
					{
						...modelLocator,
						name: 'modelId',
						modes: [
							{ name: 'list', type: 'list', typeOptions: { searchListMethod: 'videoModelSearch' } },
						],
						displayOptions: { show: { resource: ['video'], operation: ['generate'] } },
					},
				] as INodeTypeDescription['properties'],
			});
			mockAvailableModels(['gpt-4.1-mini']);

			const result = await service.findUnavailableResourceLocatorValues(user, {
				nodeType: '@n8n/n8n-nodes.openAi',
				version: 2.2,
				credentialType: 'openAiApi',
				credentialId: 'cred-1',
				parameters: {
					resource: 'text',
					operation: 'message',
					modelId: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
				},
			});

			expect(result).toEqual([]);
			expect(dynamicNodeParametersService.getResourceLocatorResults).toHaveBeenCalledTimes(1);
			expect(dynamicNodeParametersService.getResourceLocatorResults.mock.calls[0]?.[0]).toBe(
				'modelSearch',
			);
		});

		test('ignores a stale value left behind by an inactive operation', async () => {
			mockNodeDescription({
				name: '@n8n/n8n-nodes.openAi',
				properties: [
					{ displayName: 'Resource', name: 'resource', type: 'options', default: 'text' },
					{
						...modelLocator,
						name: 'imageModel',
						displayOptions: { show: { resource: ['image'] } },
					},
				] as INodeTypeDescription['properties'],
			});
			mockAvailableModels(['gpt-image-2']);

			const result = await service.findUnavailableResourceLocatorValues(user, {
				nodeType: '@n8n/n8n-nodes.openAi',
				version: 2.2,
				credentialType: 'openAiApi',
				credentialId: 'cred-1',
				// Left over from when this node was configured for images.
				parameters: { resource: 'text', imageModel: { __rl: true, mode: 'id', value: 'dall-e-3' } },
			});

			expect(result).toEqual([]);
			expect(dynamicNodeParametersService.getResourceLocatorResults).not.toHaveBeenCalled();
		});

		test('covers non-AI nodes too, e.g. a channel the account cannot reach', async () => {
			mockCredentialOwned({ type: 'slackApi', name: 'My Slack' });
			mockNodeDescription({
				name: 'n8n-nodes-base.slack',
				properties: [
					{
						displayName: 'Channel',
						name: 'channel',
						type: 'resourceLocator',
						modes: [
							{ name: 'list', type: 'list', typeOptions: { searchListMethod: 'getChannels' } },
						],
					},
				] as INodeTypeDescription['properties'],
			});
			dynamicNodeParametersService.getResourceLocatorResults.mockResolvedValue({
				results: [{ name: '#random', value: '#random' }],
			} as never);

			const result = await service.findUnavailableResourceLocatorValues(user, {
				nodeType: 'n8n-nodes-base.slack',
				version: 2.3,
				credentialType: 'slackApi',
				credentialId: 'cred-1',
				parameters: { channel: { __rl: true, mode: 'list', value: '#general' } },
			});

			expect(result).toHaveLength(1);
			expect(result[0]?.currentValue).toBe('#general');
		});

		/** Queue one provider response per page; the last one ends the list. */
		function mockPages(pages: Array<{ ids: string[]; nextToken?: string }>) {
			dynamicNodeParametersService.getResourceLocatorResults.mockReset();
			for (const page of pages) {
				dynamicNodeParametersService.getResourceLocatorResults.mockResolvedValueOnce({
					results: page.ids.map((id) => ({ name: id, value: id })),
					...(page.nextToken ? { paginationToken: page.nextToken } : {}),
				} as never);
			}
		}

		test('follows pagination and reports against the full list once it ends', async () => {
			mockAiNode([modelLocator]);
			mockPages([
				{ ids: ['gpt-4o-mini'], nextToken: 'p2' },
				{ ids: ['gpt-4.1-mini'], nextToken: 'p3' },
				{ ids: ['gpt-5-mini'] },
			]);

			const result = await service.findUnavailableResourceLocatorValues(user, {
				...openAiParams,
				parameters: { model: { __rl: true, mode: 'list', value: 'gpt-5.4' } },
			});

			expect(dynamicNodeParametersService.getResourceLocatorResults).toHaveBeenCalledTimes(3);
			expect(result).toHaveLength(1);
		});

		test('finds a value on a later page rather than flagging it', async () => {
			mockAiNode([modelLocator]);
			mockPages([{ ids: ['gpt-4o-mini'], nextToken: 'p2' }, { ids: ['gpt-5.4'] }]);

			const result = await service.findUnavailableResourceLocatorValues(user, {
				...openAiParams,
				parameters: { model: { __rl: true, mode: 'list', value: 'gpt-5.4' } },
			});

			expect(result).toEqual([]);
		});

		test('reports nothing when the list is longer than the page budget', async () => {
			mockAiNode([modelLocator]);
			// Never terminates — every page hands back another token.
			mockAvailableModels(['gpt-5-mini'], 'next-page-token');

			const result = await service.findUnavailableResourceLocatorValues(user, {
				...openAiParams,
				parameters: { model: { __rl: true, mode: 'list', value: 'gpt-5.4' } },
			});

			expect(result).toEqual([]);
			expect(dynamicNodeParametersService.getResourceLocatorResults).toHaveBeenCalledTimes(5);
			expect(logger.debug).toHaveBeenCalledWith(
				'Resource-locator list too long to validate against',
				expect.objectContaining({ parameter: 'model' }),
			);
		});

		test('reports nothing when the lookup returns an empty list', async () => {
			mockAiNode([modelLocator]);
			mockAvailableModels([]);

			const result = await service.findUnavailableResourceLocatorValues(user, {
				...openAiParams,
				parameters: { model: { __rl: true, mode: 'list', value: 'dall-e-3' } },
			});

			expect(result).toEqual([]);
		});

		test('reports nothing when the lookup fails, rather than flagging the value', async () => {
			mockAiNode([modelLocator]);
			dynamicNodeParametersService.getResourceLocatorResults.mockRejectedValue(
				new Error('provider unreachable'),
			);

			const result = await service.findUnavailableResourceLocatorValues(user, {
				...openAiParams,
				parameters: { model: { __rl: true, mode: 'list', value: 'gpt-5.4' } },
			});

			expect(result).toEqual([]);
		});

		test('ignores empty list-mode values and locators with no search method', async () => {
			mockAiNode([
				modelLocator,
				{
					displayName: 'Other',
					name: 'other',
					type: 'resourceLocator',
					modes: [{ name: 'id', type: 'string' }],
				},
			]);
			mockAvailableModels(['gpt-5-mini']);

			const result = await service.findUnavailableResourceLocatorValues(user, {
				...openAiParams,
				parameters: {
					model: { __rl: true, mode: 'list', value: '' },
					other: { __rl: true, mode: 'id', value: 'anything' },
				},
			});

			expect(result).toEqual([]);
			expect(dynamicNodeParametersService.getResourceLocatorResults).not.toHaveBeenCalled();
		});
	});
});
