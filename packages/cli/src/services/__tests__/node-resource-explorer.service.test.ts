import type { Logger } from '@n8n/backend-common';
import type { ProjectRepository, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { NodeTypes } from '@/node-types';
import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { NodeResourceExplorerService } from '@/services/node-resource-explorer.service';

jest.mock('@/workflow-execute-additional-data', () => ({
	getBase: jest.fn().mockResolvedValue({ additional: 'data' }),
}));

describe('NodeResourceExplorerService', () => {
	const user = mock<User>({ id: 'user-1' });

	let logger: jest.Mocked<Logger>;
	let dynamicNodeParametersService: jest.Mocked<DynamicNodeParametersService>;
	let credentialsFinderService: jest.Mocked<CredentialsFinderService>;
	let projectRepository: jest.Mocked<ProjectRepository>;
	let nodeTypes: jest.Mocked<NodeTypes>;
	let service: NodeResourceExplorerService;

	beforeEach(() => {
		jest.clearAllMocks();
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

	test('rejects when the credential type does not match the requested type', async () => {
		mockCredentialOwned({ type: 'someOtherApi' });

		await expect(service.exploreResources(user, baseParams)).rejects.toThrow(
			'Credential cred-1 not found or not accessible',
		);
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
});
