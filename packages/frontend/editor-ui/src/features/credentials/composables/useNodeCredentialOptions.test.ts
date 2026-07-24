import { computed, shallowRef } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { ICredentialType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { mockedStore } from '@/__tests__/utils';
import { useCredentialsStore } from '../credentials.store';
import { useNodeCredentialOptions } from './useNodeCredentialOptions';

vi.mock('@/features/resolvers/composables/usePrivateCredentials', () => ({
	usePrivateCredentials: vi.fn(() => ({ isEnabled: computed(() => false) })),
}));

vi.mock('@/app/stores/workflowDocument.store', async () => {
	const actual = await vi.importActual('@/app/stores/workflowDocument.store');
	return {
		...actual,
		injectWorkflowDocumentStore: () => undefined,
	};
});

const slackApiType = {
	name: 'slackApi',
	displayName: 'Slack API',
	properties: [],
} satisfies ICredentialType;

const slackOAuth2ApiType = {
	name: 'slackOAuth2Api',
	displayName: 'Slack OAuth2 API',
	extends: ['oAuth2Api'],
	properties: [],
} satisfies ICredentialType;

const slackNodeType = {
	name: 'n8n-nodes-base.slack',
	displayName: 'Slack',
	description: '',
	group: [],
	version: 2,
	defaults: { name: 'Slack' },
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'slackApi',
			required: true,
			displayOptions: {
				show: {
					authentication: ['accessToken'],
				},
			},
		},
		{
			name: 'slackOAuth2Api',
			required: true,
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
			},
		},
	],
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
	],
} satisfies INodeTypeDescription;

const slackNode: INodeUi = {
	parameters: {
		authentication: 'accessToken',
	},
	type: 'n8n-nodes-base.slack',
	typeVersion: 2,
	position: [0, 0],
	id: 'slack-node-id',
	name: 'Send Slack Message',
	credentials: {},
};

function createCredential(overrides: { id: string; name: string; type: string }) {
	return {
		...overrides,
		isManaged: false,
		createdAt: '',
		updatedAt: '',
	};
}

function setupOptions(overrideCredType = '') {
	const node = computed(() => slackNode);
	const nodeType = computed(() => slackNodeType);
	return useNodeCredentialOptions(node, nodeType, overrideCredType);
}

describe('useNodeCredentialOptions', () => {
	let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.state.credentialTypes = {
			slackApi: slackApiType,
			slackOAuth2Api: slackOAuth2ApiType,
		};
		credentialsStore.state.credentials = {
			'token-cred': createCredential({
				id: 'token-cred',
				name: 'Team Slack Token',
				type: 'slackApi',
			}),
			'oauth-cred': createCredential({
				id: 'oauth-cred',
				name: 'Slack account',
				type: 'slackOAuth2Api',
			}),
		};
	});

	it('shows only override credential type options for setup cards', () => {
		const { credentialTypesNodeDescriptionDisplayed } = setupOptions('slackApi');

		expect(credentialTypesNodeDescriptionDisplayed.value).toHaveLength(1);
		expect(credentialTypesNodeDescriptionDisplayed.value[0].options).toEqual([
			expect.objectContaining({ id: 'token-cred', type: 'slackApi' }),
		]);
	});

	it('shows only OAuth credentials when override is slackOAuth2Api', () => {
		const { credentialTypesNodeDescriptionDisplayed } = setupOptions('slackOAuth2Api');

		expect(credentialTypesNodeDescriptionDisplayed.value).toHaveLength(1);
		expect(credentialTypesNodeDescriptionDisplayed.value[0].options).toEqual([
			expect.objectContaining({ id: 'oauth-cred', type: 'slackOAuth2Api' }),
		]);
	});

	it('keeps mixed credential options in the NDV when no override is set', () => {
		const { credentialTypesNodeDescriptionDisplayed } = setupOptions('');

		expect(credentialTypesNodeDescriptionDisplayed.value).toHaveLength(1);
		expect(
			credentialTypesNodeDescriptionDisplayed.value[0].options.map((option) => option.id),
		).toEqual(['token-cred', 'oauth-cred']);
	});

	it('keeps independent credential types out of the main authentication dropdown', () => {
		const httpBasicAuth = {
			name: 'httpBasicAuth',
			displayName: 'Basic Auth',
			properties: [],
		} satisfies ICredentialType;
		const node = computed(
			() =>
				({
					...slackNode,
					type: 'n8n-nodes-base.discord',
					parameters: {
						...slackNode.parameters,
						incomingAuthentication: 'basicAuth',
					},
				}) as INodeUi,
		);
		const nodeType = computed(
			() =>
				({
					...slackNodeType,
					credentials: [
						...slackNodeType.credentials,
						{
							name: 'httpBasicAuth',
							required: true,
							displayOptions: {
								show: {
									incomingAuthentication: ['basicAuth'],
								},
							},
						},
					],
				}) as INodeTypeDescription,
		);
		credentialsStore.state.credentialTypes.httpBasicAuth = httpBasicAuth;
		credentialsStore.state.credentials['basic-auth-cred'] = createCredential({
			id: 'basic-auth-cred',
			name: 'Webhook Basic Auth',
			type: 'httpBasicAuth',
		});

		const { credentialTypesNodeDescriptionDisplayed } = useNodeCredentialOptions(
			node,
			nodeType,
			'',
			true,
		);

		expect(
			credentialTypesNodeDescriptionDisplayed.value[0].options.map((option) => option.type),
		).toEqual(['slackApi', 'slackOAuth2Api']);
		expect(
			credentialTypesNodeDescriptionDisplayed.value[1].options.map((option) => option.type),
		).toEqual(['httpBasicAuth']);
	});

	it('disables mixed credential behavior when override is set', () => {
		const slackApiDescription = slackNodeType.credentials[0];
		const { showMixedCredentials } = setupOptions('slackApi');

		expect(showMixedCredentials(slackApiDescription)).toBe(false);
	});

	it('enables mixed credential behavior without override on auth-switchable nodes', () => {
		const slackApiDescription = slackNodeType.credentials[0];
		const { showMixedCredentials } = setupOptions('');

		expect(showMixedCredentials(slackApiDescription)).toBe(true);
	});

	it('reacts when override changes from empty to a pinned type', () => {
		const overrideCredType = shallowRef('');
		const node = computed(() => slackNode);
		const nodeType = computed(() => slackNodeType);
		const { credentialTypesNodeDescriptionDisplayed } = useNodeCredentialOptions(
			node,
			nodeType,
			overrideCredType,
		);

		expect(
			credentialTypesNodeDescriptionDisplayed.value[0].options.map((option) => option.id),
		).toEqual(['token-cred', 'oauth-cred']);

		overrideCredType.value = 'slackApi';

		expect(
			credentialTypesNodeDescriptionDisplayed.value[0].options.map((option) => option.id),
		).toEqual(['token-cred']);
	});
});
