import { useTemplatesStore } from '@/stores/templates.store';
import { keyFromCredentialTypeAndName } from '@/utils/templates/templateTransforms';
import type {
	TemplateCredentialKey,
	IWorkflowTemplateNodeWithCredentials,
} from '@/utils/templates/templateTransforms';
import type { CredentialUsages } from '@/views/SetupWorkflowFromTemplateView/setupTemplate.store';
import {
	getAppCredentials,
	getAppsRequiringCredentials,
	useSetupTemplateStore,
	groupNodeCredentialsByKey,
} from '@/views/SetupWorkflowFromTemplateView/setupTemplate.store';
import { setActivePinia } from 'pinia';
import * as testData from './setupTemplate.store.testData';
import { createTestingPinia } from '@pinia/testing';
import { useCredentialsStore } from '@/stores/credentials.store';
import { newWorkflowTemplateNode } from '@/utils/testData/templateTestData';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

const objToMap = <TKey extends string, T>(obj: Record<TKey, T>) => {
	return new Map(Object.entries(obj)) as Map<TKey, T>;
};

describe('SetupWorkflowFromTemplateView store', () => {
	const nodesByName = {
		Twitter: {
			name: 'Twitter',
			type: 'n8n-nodes-base.twitter',
			position: [720, -220],
			parameters: {
				text: '=Hey there, my design is now on a new product ✨\nVisit my {{$json["vendor"]}} shop to get this cool{{$json["title"]}} (and check out more {{$json["product_type"]}}) 🛍️',
				additionalFields: {},
			},
			credentials: {
				twitterOAuth1Api: 'twitter',
			},
			typeVersion: 1,
		},
	} satisfies Record<string, IWorkflowTemplateNodeWithCredentials>;

	describe('groupNodeCredentialsByTypeAndName', () => {
		it('returns an empty array if there are no nodes', () => {
			expect(groupNodeCredentialsByKey([])).toEqual(new Map());
		});

		it('returns credentials grouped by type and name', () => {
			expect(
				groupNodeCredentialsByKey([
					{
						node: nodesByName.Twitter,
						requiredCredentials: testData.nodeTypeTwitterV1.credentials,
					},
				]),
			).toEqual(
				objToMap({
					'twitterOAuth1Api-twitter': {
						key: 'twitterOAuth1Api-twitter',
						credentialName: 'twitter',
						credentialType: 'twitterOAuth1Api',
						nodeTypeName: 'n8n-nodes-base.twitter',
						usedBy: [nodesByName.Twitter],
					},
				}),
			);
		});

		it('returns credentials grouped when the credential names are the same', () => {
			const [node1, node2] = [
				newWorkflowTemplateNode({
					type: 'n8n-nodes-base.twitter',
					credentials: {
						twitterOAuth1Api: 'credential',
					},
				}) as IWorkflowTemplateNodeWithCredentials,
				newWorkflowTemplateNode({
					type: 'n8n-nodes-base.telegram',
					credentials: {
						telegramApi: 'credential',
					},
				}) as IWorkflowTemplateNodeWithCredentials,
			];

			expect(
				groupNodeCredentialsByKey([
					{
						node: node1,
						requiredCredentials: testData.nodeTypeTwitterV1.credentials,
					},
					{
						node: node2,
						requiredCredentials: testData.nodeTypeTelegramV1.credentials,
					},
				]),
			).toEqual(
				objToMap({
					'twitterOAuth1Api-credential': {
						key: 'twitterOAuth1Api-credential',
						credentialName: 'credential',
						credentialType: 'twitterOAuth1Api',
						nodeTypeName: 'n8n-nodes-base.twitter',
						usedBy: [node1],
					},
					'telegramApi-credential': {
						key: 'telegramApi-credential',
						credentialName: 'credential',
						credentialType: 'telegramApi',
						nodeTypeName: 'n8n-nodes-base.telegram',
						usedBy: [node2],
					},
				}),
			);
		});
	});

	describe('getAppsRequiringCredentials', () => {
		it('returns an empty array if there are no nodes', () => {
			const appNameByNodeTypeName = () => 'Twitter';
			expect(getAppsRequiringCredentials(new Map(), appNameByNodeTypeName)).toEqual([]);
		});

		it('returns an array of apps requiring credentials', () => {
			const credentialUsages = objToMap<TemplateCredentialKey, CredentialUsages>({
				[keyFromCredentialTypeAndName('twitterOAuth1Api', 'twitter')]: {
					key: keyFromCredentialTypeAndName('twitterOAuth1Api', 'twitter'),
					credentialName: 'twitter',
					credentialType: 'twitterOAuth1Api',
					nodeTypeName: 'n8n-nodes-base.twitter',
					usedBy: [nodesByName.Twitter],
				},
			});

			const appNameByNodeTypeName = () => 'Twitter';

			expect(getAppsRequiringCredentials(credentialUsages, appNameByNodeTypeName)).toEqual([
				{
					appName: 'Twitter',
					count: 1,
				},
			]);
		});
	});

	describe('getAppCredentials', () => {
		it('returns an empty array if there are no nodes', () => {
			const appNameByNodeTypeName = () => 'Twitter';
			expect(getAppCredentials([], appNameByNodeTypeName)).toEqual([]);
		});

		it('returns an array of apps requiring credentials', () => {
			const credentialUsages: CredentialUsages[] = [
				{
					key: keyFromCredentialTypeAndName('twitterOAuth1Api', 'twitter'),
					credentialName: 'twitter',
					credentialType: 'twitterOAuth1Api',
					nodeTypeName: 'n8n-nodes-base.twitter',
					usedBy: [nodesByName.Twitter],
				},
			];

			const appNameByNodeTypeName = () => 'Twitter';

			expect(getAppCredentials(credentialUsages, appNameByNodeTypeName)).toEqual([
				{
					appName: 'Twitter',
					credentials: [
						{
							key: 'twitterOAuth1Api-twitter',
							credentialName: 'twitter',
							credentialType: 'twitterOAuth1Api',
							nodeTypeName: 'n8n-nodes-base.twitter',
							usedBy: [nodesByName.Twitter],
						},
					],
				},
			]);
		});
	});

	describe('credentialOverrides', () => {
		beforeEach(() => {
			setActivePinia(
				createTestingPinia({
					stubActions: false,
				}),
			);

			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentialTypes([testData.credentialTypeTelegram]);
			const templatesStore = useTemplatesStore();
			templatesStore.addWorkflows([testData.fullShopifyTelegramTwitterTemplate]);
			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.setNodeTypes([
				testData.nodeTypeTelegramV1,
				testData.nodeTypeTwitterV1,
				testData.nodeTypeShopifyTriggerV1,
			]);
			const setupTemplateStore = useSetupTemplateStore();
			setupTemplateStore.setTemplateId(testData.fullShopifyTelegramTwitterTemplate.id.toString());
		});

		it('should return an empty object if there are no credential overrides', () => {
			// Setup
			const setupTemplateStore = useSetupTemplateStore();

			expect(setupTemplateStore.credentialUsages.length).toBe(3);
			expect(setupTemplateStore.credentialOverrides).toEqual({});
		});

		it('should return overrides for one node', () => {
			// Setup
			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentials([testData.credentialsTelegram1]);

			const setupTemplateStore = useSetupTemplateStore();
			setupTemplateStore.setSelectedCredentialId(
				keyFromCredentialTypeAndName('twitterOAuth1Api', 'twitter'),
				testData.credentialsTelegram1.id,
			);

			expect(setupTemplateStore.credentialUsages.length).toBe(3);
			expect(setupTemplateStore.credentialOverrides).toEqual({
				'twitterOAuth1Api-twitter': {
					id: testData.credentialsTelegram1.id,
					name: testData.credentialsTelegram1.name,
				},
			});
		});
	});

	describe('setInitialCredentialsSelection', () => {
		beforeEach(() => {
			setActivePinia(
				createTestingPinia({
					stubActions: false,
				}),
			);

			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentialTypes([testData.credentialTypeTelegram]);
			const templatesStore = useTemplatesStore();
			templatesStore.addWorkflows([testData.fullShopifyTelegramTwitterTemplate]);
			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.setNodeTypes([
				testData.nodeTypeTelegramV1,
				testData.nodeTypeTwitterV1,
				testData.nodeTypeShopifyTriggerV1,
				testData.nodeTypeHttpRequestV1,
			]);
			const setupTemplateStore = useSetupTemplateStore();
			setupTemplateStore.setTemplateId(testData.fullShopifyTelegramTwitterTemplate.id.toString());
		});

		it("should select no credentials when there isn't any available", () => {
			// Setup
			const setupTemplateStore = useSetupTemplateStore();

			// Execute
			setupTemplateStore.setInitialCredentialSelection();

			expect(setupTemplateStore.selectedCredentialIdByKey).toEqual({});
		});

		it("should select credential when there's only one", () => {
			// Setup
			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentials([testData.credentialsTelegram1]);

			const setupTemplateStore = useSetupTemplateStore();

			// Execute
			setupTemplateStore.setInitialCredentialSelection();

			expect(setupTemplateStore.selectedCredentialIdByKey).toEqual({
				[keyFromCredentialTypeAndName('telegramApi', 'telegram_habot')]: 'YaSKdvEcT1TSFrrr1',
			});
		});

		it('should select no credentials when there are more than 1 available', () => {
			// Setup
			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentials([
				testData.credentialsTelegram1,
				testData.credentialsTelegram2,
			]);

			const setupTemplateStore = useSetupTemplateStore();

			// Execute
			setupTemplateStore.setInitialCredentialSelection();

			expect(setupTemplateStore.selectedCredentialIdByKey).toEqual({});
		});

		test.each([
			['httpBasicAuth', 'basicAuth'],
			['httpCustomAuth', 'basicAuth'],
			['httpDigestAuth', 'digestAuth'],
			['httpHeaderAuth', 'headerAuth'],
			['oAuth1Api', 'oAuth1'],
			['oAuth2Api', 'oAuth2'],
			['httpQueryAuth', 'queryAuth'],
		])('should not auto-select credentials for %s', (credentialType, auth) => {
			// Setup
			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentialTypes([testData.newCredentialType(credentialType)]);
			credentialsStore.setCredentials([
				testData.newCredential({
					name: `${credentialType}Credential`,
					type: credentialType,
				}),
			]);

			const templatesStore = useTemplatesStore();
			const workflow = testData.newFullOneNodeTemplate({
				name: 'Test',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				credentials: {
					[credentialType]: 'Test',
				},
				parameters: {
					authentication: auth,
				},
				position: [250, 300],
			});
			templatesStore.addWorkflows([workflow]);

			const setupTemplateStore = useSetupTemplateStore();
			setupTemplateStore.setTemplateId(workflow.id.toString());

			// Execute
			setupTemplateStore.setInitialCredentialSelection();

			expect(setupTemplateStore.credentialUsages.length).toBe(1);
			expect(setupTemplateStore.selectedCredentialIdByKey).toEqual({});
		});
	});

	describe("With template that has nodes requiring credentials but workflow doesn't have them", () => {
		beforeEach(() => {
			setActivePinia(
				createTestingPinia({
					stubActions: false,
				}),
			);

			// Setup
			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentialTypes([testData.credentialTypeTelegram]);
			const templatesStore = useTemplatesStore();
			templatesStore.addWorkflows([testData.fullSaveEmailAttachmentsToNextCloudTemplate]);
			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.setNodeTypes([
				testData.nodeTypeReadImapV1,
				testData.nodeTypeReadImapV2,
				testData.nodeTypeNextCloudV1,
			]);
			const setupTemplateStore = useSetupTemplateStore();
			setupTemplateStore.setTemplateId(
				testData.fullSaveEmailAttachmentsToNextCloudTemplate.id.toString(),
			);
		});

		const templateImapNode = testData.fullSaveEmailAttachmentsToNextCloudTemplate.workflow.nodes[0];
		const templateNextcloudNode =
			testData.fullSaveEmailAttachmentsToNextCloudTemplate.workflow.nodes[1];

		it('should return correct credential usages', () => {
			const setupTemplateStore = useSetupTemplateStore();
			expect(setupTemplateStore.credentialUsages).toEqual([
				{
					credentialName: '',
					credentialType: 'imap',
					key: 'imap-',
					nodeTypeName: 'n8n-nodes-base.emailReadImap',
					usedBy: [templateImapNode],
				},
				{
					credentialName: '',
					credentialType: 'nextCloudApi',
					key: 'nextCloudApi-',
					nodeTypeName: 'n8n-nodes-base.nextCloud',
					usedBy: [templateNextcloudNode],
				},
			]);
		});

		it('should return correct app credentials', () => {
			const setupTemplateStore = useSetupTemplateStore();
			expect(setupTemplateStore.appCredentials).toEqual([
				{
					appName: 'Email (IMAP)',
					credentials: [
						{
							credentialName: '',
							credentialType: 'imap',
							key: 'imap-',
							nodeTypeName: 'n8n-nodes-base.emailReadImap',
							usedBy: [templateImapNode],
						},
					],
				},
				{
					appName: 'Nextcloud',
					credentials: [
						{
							credentialName: '',
							credentialType: 'nextCloudApi',
							key: 'nextCloudApi-',
							nodeTypeName: 'n8n-nodes-base.nextCloud',
							usedBy: [templateNextcloudNode],
						},
					],
				},
			]);
		});
	});
});
