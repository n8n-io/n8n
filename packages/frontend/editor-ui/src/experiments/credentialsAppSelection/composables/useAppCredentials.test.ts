import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useAppCredentials } from './useAppCredentials';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { mockedStore } from '@/__tests__/utils';
import type { ICredentialType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { CommunityNodeType } from '@n8n/api-types';

vi.mock('@/features/shared/nodeCreator/nodeCreator.utils', () => ({
	removePreviewToken: (name: string) => name.replace('[preview]', ''),
}));

function createMockNodeType(overrides: Partial<INodeTypeDescription> = {}): INodeTypeDescription {
	return {
		displayName: 'Test Node',
		name: 'n8n-nodes-base.testNode',
		group: [],
		version: 1,
		description: 'Test node',
		defaults: { name: 'Test Node' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
		credentials: [],
		...overrides,
	} as INodeTypeDescription;
}

function createMockCredentialType(overrides: Partial<ICredentialType> = {}): ICredentialType {
	return {
		name: 'testApi',
		displayName: 'Test API',
		properties: [],
		...overrides,
	} as ICredentialType;
}

describe('useAppCredentials', () => {
	let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		credentialsStore = mockedStore(useCredentialsStore);
		nodeTypesStore = mockedStore(useNodeTypesStore);

		// Default mock setup
		nodeTypesStore.fetchCommunityNodePreviews = vi.fn().mockResolvedValue(undefined);
		nodeTypesStore.communityNodeType = vi.fn().mockReturnValue(undefined);
		nodeTypesStore.getIsNodeInstalled = vi.fn().mockReturnValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('filtering', () => {
		it('should filter out excluded credential types', () => {
			const excludedCredNames = [
				'oAuth2Api',
				'oAuth1Api',
				'httpBasicAuth',
				'httpDigestAuth',
				'httpHeaderAuth',
				'httpQueryAuth',
				'httpCustomAuth',
				'noAuth',
			];

			const credentialTypes = excludedCredNames.map((name) =>
				createMockCredentialType({ name, displayName: name }),
			);
			// Add one valid credential type
			credentialTypes.push(
				createMockCredentialType({ name: 'slackApi', displayName: 'Slack API' }),
			);

			credentialsStore.allCredentialTypes = credentialTypes;

			// Node that references all these credential types
			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					credentials: [...excludedCredNames.map((name) => ({ name })), { name: 'slackApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value).toHaveLength(1);
			expect(appEntries.value[0].credentialType?.name).toBe('slackApi');
		});

		it('should filter out excluded node types', () => {
			const excludedNodeNames = [
				'n8n-nodes-base.httpRequest',
				'n8n-nodes-base.webhook',
				'n8n-nodes-base.code',
				'n8n-nodes-base.scheduleTrigger',
				'n8n-nodes-base.emailSend',
				'n8n-nodes-base.set',
				'n8n-nodes-base.if',
				'n8n-nodes-base.switch',
				'n8n-nodes-base.merge',
				'n8n-nodes-base.splitInBatches',
				'n8n-nodes-base.noOp',
				'n8n-nodes-base.start',
				'n8n-nodes-base.stickyNote',
				'n8n-nodes-base.executeWorkflow',
				'n8n-nodes-base.executeWorkflowTrigger',
				'n8n-nodes-base.respondToWebhook',
				'n8n-nodes-base.manualTrigger',
				'n8n-nodes-base.errorTrigger',
				'n8n-nodes-base.function',
				'n8n-nodes-base.functionItem',
			];

			const validCred = createMockCredentialType({
				name: 'slackApi',
				displayName: 'Slack API',
			});
			credentialsStore.allCredentialTypes = [validCred];

			const nodes = excludedNodeNames.map((name) =>
				createMockNodeType({
					name,
					displayName: name,
					credentials: [{ name: 'slackApi' }],
				}),
			);
			// Add one valid node
			nodes.push(
				createMockNodeType({
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					credentials: [{ name: 'slackApi' }],
				}),
			);

			nodeTypesStore.visibleNodeTypes = nodes;

			const { appEntries } = useAppCredentials();

			expect(appEntries.value).toHaveLength(1);
			expect(appEntries.value[0].app.name).toBe('n8n-nodes-base.slack');
		});

		it('should filter out LangChain nodes', () => {
			const validCred = createMockCredentialType({
				name: 'openAiApi',
				displayName: 'OpenAI API',
			});
			credentialsStore.allCredentialTypes = [validCred];

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: '@n8n/n8n-nodes-langchain.openAi',
					displayName: 'OpenAI',
					credentials: [{ name: 'openAiApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value).toHaveLength(0);
		});

		it('should filter out trigger nodes', () => {
			const validCred = createMockCredentialType({
				name: 'slackApi',
				displayName: 'Slack API',
			});
			credentialsStore.allCredentialTypes = [validCred];

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.slackTrigger',
					displayName: 'Slack Trigger',
					group: ['trigger'],
					credentials: [{ name: 'slackApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value).toHaveLength(0);
		});

		it('should filter out AI tool nodes', () => {
			const validCred = createMockCredentialType({
				name: 'calculatorApi',
				displayName: 'Calculator API',
			});
			credentialsStore.allCredentialTypes = [validCred];

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.calculatorTool',
					displayName: 'Calculator Tool',
					outputs: [NodeConnectionTypes.AiTool],
					credentials: [{ name: 'calculatorApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value).toHaveLength(0);
		});

		it('should filter out AI tool nodes with INodeOutputConfiguration outputs', () => {
			const validCred = createMockCredentialType({
				name: 'someApi',
				displayName: 'Some API',
			});
			credentialsStore.allCredentialTypes = [validCred];

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.someTool',
					displayName: 'Some Tool',
					outputs: [{ type: NodeConnectionTypes.AiTool }],
					credentials: [{ name: 'someApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value).toHaveLength(0);
		});

		it('should filter out installed nodes without credentials', () => {
			credentialsStore.allCredentialTypes = [];

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.noCredNode',
					displayName: 'No Cred Node',
					credentials: [],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value).toHaveLength(0);
		});

		it('should skip unofficial community nodes', () => {
			const validCred = createMockCredentialType({
				name: 'someApi',
				displayName: 'Some API',
			});
			credentialsStore.allCredentialTypes = [validCred];

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-community.someNode',
					displayName: 'Community Node',
					credentials: [{ name: 'someApi' }],
				}),
			];

			// Return unofficial community node info
			nodeTypesStore.communityNodeType = vi.fn().mockReturnValue({
				isOfficialNode: false,
				packageName: 'n8n-nodes-community',
				numberOfDownloads: 100,
			});

			const { appEntries } = useAppCredentials();

			expect(appEntries.value).toHaveLength(0);
		});
	});

	describe('credential priority', () => {
		it('should prioritize Google OAuth over plain OAuth2', () => {
			const googleOAuth = createMockCredentialType({
				name: 'googleSheetsOAuth2Api',
				displayName: 'Google Sheets OAuth2',
				extends: ['googleOAuth2Api'],
			});
			const plainOAuth = createMockCredentialType({
				name: 'googleSheetsApi',
				displayName: 'Google Sheets API Key',
			});

			credentialsStore.allCredentialTypes = [googleOAuth, plainOAuth];

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.googleSheets',
					displayName: 'Google Sheets',
					credentials: [{ name: 'googleSheetsOAuth2Api' }, { name: 'googleSheetsApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value).toHaveLength(1);
			expect(appEntries.value[0].credentialType?.name).toBe('googleSheetsOAuth2Api');
			expect(appEntries.value[0].supportsInstantOAuth).toBe(true);
		});

		it('should prioritize Microsoft OAuth over plain OAuth2', () => {
			const msOAuth = createMockCredentialType({
				name: 'microsoftOutlookOAuth2Api',
				displayName: 'Microsoft Outlook OAuth2',
				extends: ['microsoftOAuth2Api'],
			});
			const plainApi = createMockCredentialType({
				name: 'microsoftOutlookApi',
				displayName: 'Microsoft Outlook API',
			});

			credentialsStore.allCredentialTypes = [msOAuth, plainApi];

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.microsoftOutlook',
					displayName: 'Microsoft Outlook',
					credentials: [{ name: 'microsoftOutlookOAuth2Api' }, { name: 'microsoftOutlookApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value).toHaveLength(1);
			expect(appEntries.value[0].credentialType?.name).toBe('microsoftOutlookOAuth2Api');
			expect(appEntries.value[0].supportsInstantOAuth).toBe(true);
		});

		it('should prioritize OAuth2 with instant OAuth over plain OAuth2', () => {
			const oAuth2WithInstant = createMockCredentialType({
				name: 'slackOAuth2Api',
				displayName: 'Slack OAuth2',
				extends: ['oAuth2Api'],
				__overwrittenProperties: ['clientId', 'clientSecret'],
			});
			const plainOAuth2 = createMockCredentialType({
				name: 'slackOAuth2ManualApi',
				displayName: 'Slack OAuth2 Manual',
				extends: ['oAuth2Api'],
			});

			credentialsStore.allCredentialTypes = [oAuth2WithInstant, plainOAuth2];

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					credentials: [{ name: 'slackOAuth2Api' }, { name: 'slackOAuth2ManualApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value).toHaveLength(1);
			expect(appEntries.value[0].credentialType?.name).toBe('slackOAuth2Api');
			expect(appEntries.value[0].supportsInstantOAuth).toBe(true);
		});

		it('should prioritize OAuth2 over API key credentials', () => {
			const oAuth2Cred = createMockCredentialType({
				name: 'hubspotOAuth2Api',
				displayName: 'HubSpot OAuth2',
				extends: ['oAuth2Api'],
			});
			const apiKeyCred = createMockCredentialType({
				name: 'hubspotApi',
				displayName: 'HubSpot API Key',
			});

			credentialsStore.allCredentialTypes = [apiKeyCred, oAuth2Cred];

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.hubspot',
					displayName: 'HubSpot',
					credentials: [{ name: 'hubspotApi' }, { name: 'hubspotOAuth2Api' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value).toHaveLength(1);
			expect(appEntries.value[0].credentialType?.name).toBe('hubspotOAuth2Api');
			expect(appEntries.value[0].supportsInstantOAuth).toBe(false);
		});

		it('should mark supportsInstantOAuth as false for API key credentials', () => {
			const apiKeyCred = createMockCredentialType({
				name: 'stripeApi',
				displayName: 'Stripe API',
			});

			credentialsStore.allCredentialTypes = [apiKeyCred];

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.stripe',
					displayName: 'Stripe',
					credentials: [{ name: 'stripeApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value).toHaveLength(1);
			expect(appEntries.value[0].supportsInstantOAuth).toBe(false);
		});
	});

	describe('sorting', () => {
		it('should sort bundled apps by popularity ranking', () => {
			const gmailCred = createMockCredentialType({
				name: 'gmailOAuth2',
				displayName: 'Gmail OAuth2',
			});
			const slackCred = createMockCredentialType({
				name: 'slackApi',
				displayName: 'Slack API',
			});
			const githubCred = createMockCredentialType({
				name: 'githubApi',
				displayName: 'GitHub API',
			});

			credentialsStore.allCredentialTypes = [slackCred, githubCred, gmailCred];

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					credentials: [{ name: 'slackApi' }],
				}),
				createMockNodeType({
					name: 'n8n-nodes-base.github',
					displayName: 'GitHub',
					credentials: [{ name: 'githubApi' }],
				}),
				createMockNodeType({
					name: 'n8n-nodes-base.gmail',
					displayName: 'Gmail',
					credentials: [{ name: 'gmailOAuth2' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			// gmail=1, slack=10, github=21
			expect(appEntries.value.map((e) => e.app.displayName)).toEqual(['Gmail', 'Slack', 'GitHub']);
		});

		it('should place bundled apps with popularity before those without', () => {
			const gmailCred = createMockCredentialType({
				name: 'gmailOAuth2',
				displayName: 'Gmail OAuth2',
			});
			const unknownCred = createMockCredentialType({
				name: 'unknownServiceApi',
				displayName: 'Unknown Service API',
			});

			credentialsStore.allCredentialTypes = [unknownCred, gmailCred];

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.unknownService',
					displayName: 'Unknown Service',
					credentials: [{ name: 'unknownServiceApi' }],
				}),
				createMockNodeType({
					name: 'n8n-nodes-base.gmail',
					displayName: 'Gmail',
					credentials: [{ name: 'gmailOAuth2' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value[0].app.displayName).toBe('Gmail');
			expect(appEntries.value[1].app.displayName).toBe('Unknown Service');
		});

		it('should sort bundled apps without popularity alphabetically', () => {
			const zetaCred = createMockCredentialType({
				name: 'zetaApi',
				displayName: 'Zeta API',
			});
			const alphaCred = createMockCredentialType({
				name: 'alphaApi',
				displayName: 'Alpha API',
			});

			credentialsStore.allCredentialTypes = [zetaCred, alphaCred];

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.zeta',
					displayName: 'Zeta',
					credentials: [{ name: 'zetaApi' }],
				}),
				createMockNodeType({
					name: 'n8n-nodes-base.alpha',
					displayName: 'Alpha',
					credentials: [{ name: 'alphaApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value.map((e) => e.app.displayName)).toEqual(['Alpha', 'Zeta']);
		});

		it('should place bundled apps before community nodes', () => {
			const bundledCred = createMockCredentialType({
				name: 'slackApi',
				displayName: 'Slack API',
			});
			const communityCred = createMockCredentialType({
				name: 'communityServiceApi',
				displayName: 'Community Service API',
			});

			credentialsStore.allCredentialTypes = [bundledCred, communityCred];

			const communityNodeInfo = {
				isOfficialNode: true,
				packageName: 'n8n-nodes-community-service',
				numberOfDownloads: 50000,
			} as unknown as CommunityNodeType;

			nodeTypesStore.communityNodeType = vi.fn((name: string) => {
				if (name === 'n8n-nodes-community-service.communityService') {
					return communityNodeInfo;
				}
				return undefined;
			}) as typeof nodeTypesStore.communityNodeType;

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-community-service.communityService',
					displayName: 'Community Service',
					credentials: [{ name: 'communityServiceApi' }],
				}),
				createMockNodeType({
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					credentials: [{ name: 'slackApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value[0].app.displayName).toBe('Slack');
			expect(appEntries.value[0].isBundled).toBe(true);
			expect(appEntries.value[1].app.displayName).toBe('Community Service');
			expect(appEntries.value[1].isBundled).toBe(false);
		});

		it('should sort community nodes by downloads descending', () => {
			const credA = createMockCredentialType({
				name: 'communityAApi',
				displayName: 'Community A API',
			});
			const credB = createMockCredentialType({
				name: 'communityBApi',
				displayName: 'Community B API',
			});

			credentialsStore.allCredentialTypes = [credA, credB];

			nodeTypesStore.communityNodeType = vi.fn((name: string) => {
				if (name === 'n8n-nodes-pkg-a.communityA') {
					return {
						isOfficialNode: true,
						packageName: 'n8n-nodes-pkg-a',
						numberOfDownloads: 1000,
					} as unknown as CommunityNodeType;
				}
				if (name === 'n8n-nodes-pkg-b.communityB') {
					return {
						isOfficialNode: true,
						packageName: 'n8n-nodes-pkg-b',
						numberOfDownloads: 5000,
					} as unknown as CommunityNodeType;
				}
				return undefined;
			}) as typeof nodeTypesStore.communityNodeType;

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-pkg-a.communityA',
					displayName: 'Community A',
					credentials: [{ name: 'communityAApi' }],
				}),
				createMockNodeType({
					name: 'n8n-nodes-pkg-b.communityB',
					displayName: 'Community B',
					credentials: [{ name: 'communityBApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			// Community B has more downloads, should come first among community nodes
			const communityEntries = appEntries.value.filter((e) => !e.isBundled);
			expect(communityEntries[0].app.displayName).toBe('Community B');
			expect(communityEntries[1].app.displayName).toBe('Community A');
		});
	});

	describe('deduplication', () => {
		it('should deduplicate versioned nodes by simple name', () => {
			const slackCred = createMockCredentialType({
				name: 'slackApi',
				displayName: 'Slack API',
			});

			credentialsStore.allCredentialTypes = [slackCred];

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					credentials: [{ name: 'slackApi' }],
				}),
				createMockNodeType({
					name: 'n8n-nodes-base.slackV2',
					displayName: 'Slack V2',
					credentials: [{ name: 'slackApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			// Should have only one entry for slack (deduplicated by simple name)
			expect(appEntries.value).toHaveLength(1);
		});

		it('should keep the entry with higher priority credentials when deduplicating', () => {
			const apiKeyCred = createMockCredentialType({
				name: 'slackApi',
				displayName: 'Slack API Key',
			});
			const oAuthCred = createMockCredentialType({
				name: 'slackOAuth2Api',
				displayName: 'Slack OAuth2',
				extends: ['oAuth2Api'],
			});

			credentialsStore.allCredentialTypes = [apiKeyCred, oAuthCred];

			// Older version only has API key
			// Newer version has OAuth2
			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					credentials: [{ name: 'slackApi' }],
				}),
				createMockNodeType({
					name: 'n8n-nodes-base.slackV2',
					displayName: 'Slack V2',
					credentials: [{ name: 'slackOAuth2Api' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value).toHaveLength(1);
			expect(appEntries.value[0].credentialType?.name).toBe('slackOAuth2Api');
		});
	});

	describe('app info', () => {
		it('should build AppInfo with icon from node type', () => {
			const cred = createMockCredentialType({
				name: 'slackApi',
				displayName: 'Slack API',
			});
			credentialsStore.allCredentialTypes = [cred];

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					icon: 'file:slack.svg',
					iconColor: 'purple',
					credentials: [{ name: 'slackApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value[0].app).toEqual(
				expect.objectContaining({
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					icon: 'file:slack.svg',
					iconColor: 'purple',
				}),
			);
		});

		it('should handle themed icons with light and dark variants', () => {
			const cred = createMockCredentialType({
				name: 'serviceApi',
				displayName: 'Service API',
			});
			credentialsStore.allCredentialTypes = [cred];

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.service',
					displayName: 'Service',
					icon: { light: 'file:service-light.svg', dark: 'file:service-dark.svg' },
					credentials: [{ name: 'serviceApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value[0].app.icon).toBe('file:service-light.svg');
			expect(appEntries.value[0].app.iconDark).toBe('file:service-dark.svg');
		});

		it('should handle themed iconUrl with light and dark variants', () => {
			const cred = createMockCredentialType({
				name: 'serviceApi',
				displayName: 'Service API',
			});
			credentialsStore.allCredentialTypes = [cred];

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.service',
					displayName: 'Service',
					iconUrl: {
						light: 'https://example.com/light.png',
						dark: 'https://example.com/dark.png',
					},
					credentials: [{ name: 'serviceApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value[0].app.iconUrl).toBe('https://example.com/light.png');
			expect(appEntries.value[0].app.iconUrlDark).toBe('https://example.com/dark.png');
		});
	});

	describe('community nodes', () => {
		it('should set isBundled to false and include packageName for community nodes', () => {
			const cred = createMockCredentialType({
				name: 'communityApi',
				displayName: 'Community API',
			});
			credentialsStore.allCredentialTypes = [cred];

			const communityInfo = {
				isOfficialNode: true,
				packageName: 'n8n-nodes-community-pkg',
				numberOfDownloads: 2000,
			};

			nodeTypesStore.communityNodeType = vi.fn().mockReturnValue(communityInfo);

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-community-pkg.communityNode',
					displayName: 'Community Node',
					credentials: [{ name: 'communityApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value).toHaveLength(1);
			expect(appEntries.value[0].isBundled).toBe(false);
			expect(appEntries.value[0].packageName).toBe('n8n-nodes-community-pkg');
			expect(appEntries.value[0].popularity).toBe(2000);
			expect(appEntries.value[0].communityNodeInfo).toBe(communityInfo);
		});

		it('should include uninstalled community nodes without credentials', () => {
			credentialsStore.allCredentialTypes = [
				createMockCredentialType({ name: 'someOtherApi', displayName: 'Other' }),
			];

			const communityInfo = {
				isOfficialNode: true,
				packageName: 'n8n-nodes-uninstalled-pkg',
				numberOfDownloads: 500,
			};

			nodeTypesStore.communityNodeType = vi.fn().mockReturnValue(communityInfo);
			nodeTypesStore.getIsNodeInstalled = vi.fn().mockReturnValue(false);

			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-uninstalled-pkg.uninstalledNode',
					displayName: 'Uninstalled Node',
					// Has credential refs, but they are not in allCredentialTypes (not installed)
					credentials: [{ name: 'uninstalledApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			// Uninstalled community nodes are included even without matching credentials
			expect(appEntries.value).toHaveLength(1);
			expect(appEntries.value[0].installed).toBe(false);
			expect(appEntries.value[0].credentialType).toBeUndefined();
		});
	});

	describe('loading state', () => {
		it('should return empty entries when no credential types are loaded', () => {
			credentialsStore.allCredentialTypes = [];
			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					credentials: [{ name: 'slackApi' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value).toEqual([]);
		});

		it('should return empty entries when no visible node types are loaded', () => {
			credentialsStore.allCredentialTypes = [
				createMockCredentialType({ name: 'slackApi', displayName: 'Slack API' }),
			];
			nodeTypesStore.visibleNodeTypes = [];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value).toEqual([]);
		});

		it('should set isLoading to false when both stores have data', () => {
			credentialsStore.allCredentialTypes = [
				createMockCredentialType({ name: 'slackApi', displayName: 'Slack API' }),
			];
			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					credentials: [{ name: 'slackApi' }],
				}),
			];

			const { isLoading } = useAppCredentials();

			// The watch with immediate: true should detect data is present
			expect(isLoading.value).toBe(false);
		});

		it('should call fetchCommunityNodePreviews on initialization', () => {
			credentialsStore.allCredentialTypes = [];
			nodeTypesStore.visibleNodeTypes = [];

			useAppCredentials();

			expect(nodeTypesStore.fetchCommunityNodePreviews).toHaveBeenCalled();
		});
	});

	describe('instant OAuth detection', () => {
		it('should detect instant OAuth for Google OAuth types', () => {
			const googleCred = createMockCredentialType({
				name: 'googleSheetsOAuth2Api',
				displayName: 'Google Sheets OAuth2',
				extends: ['googleOAuth2Api'],
			});

			credentialsStore.allCredentialTypes = [googleCred];
			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.googleSheets',
					displayName: 'Google Sheets',
					credentials: [{ name: 'googleSheetsOAuth2Api' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value[0].supportsInstantOAuth).toBe(true);
		});

		it('should detect instant OAuth for Microsoft OAuth types', () => {
			const msCred = createMockCredentialType({
				name: 'microsoftExcelOAuth2Api',
				displayName: 'Microsoft Excel OAuth2',
				extends: ['microsoftOAuth2Api'],
			});

			credentialsStore.allCredentialTypes = [msCred];
			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.microsoftExcel',
					displayName: 'Microsoft Excel',
					credentials: [{ name: 'microsoftExcelOAuth2Api' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value[0].supportsInstantOAuth).toBe(true);
		});

		it('should detect instant OAuth for OAuth2 with overwritten clientId and clientSecret', () => {
			const oAuthCred = createMockCredentialType({
				name: 'someOAuth2Api',
				displayName: 'Some OAuth2',
				extends: ['oAuth2Api'],
				__overwrittenProperties: ['clientId', 'clientSecret'],
			});

			credentialsStore.allCredentialTypes = [oAuthCred];
			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.someService',
					displayName: 'Some Service',
					credentials: [{ name: 'someOAuth2Api' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value[0].supportsInstantOAuth).toBe(true);
		});

		it('should not detect instant OAuth for OAuth2 without overwritten properties', () => {
			const oAuthCred = createMockCredentialType({
				name: 'someOAuth2Api',
				displayName: 'Some OAuth2',
				extends: ['oAuth2Api'],
			});

			credentialsStore.allCredentialTypes = [oAuthCred];
			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.someService',
					displayName: 'Some Service',
					credentials: [{ name: 'someOAuth2Api' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value[0].supportsInstantOAuth).toBe(false);
		});

		it('should not detect instant OAuth for OAuth2 with only clientId overwritten', () => {
			const oAuthCred = createMockCredentialType({
				name: 'partialOAuth2Api',
				displayName: 'Partial OAuth2',
				extends: ['oAuth2Api'],
				__overwrittenProperties: ['clientId'],
			});

			credentialsStore.allCredentialTypes = [oAuthCred];
			nodeTypesStore.visibleNodeTypes = [
				createMockNodeType({
					name: 'n8n-nodes-base.partialService',
					displayName: 'Partial Service',
					credentials: [{ name: 'partialOAuth2Api' }],
				}),
			];

			const { appEntries } = useAppCredentials();

			expect(appEntries.value[0].supportsInstantOAuth).toBe(false);
		});
	});
});
