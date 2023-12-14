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
		Telegram: {
			name: 'Telegram',
			type: 'n8n-nodes-base.telegram',
			position: [720, -20],
			parameters: {
				text: '=Hey there, my design is now on a new product!\nVisit my {{$json["vendor"]}} shop to get this cool{{$json["title"]}} (and check out more {{$json["product_type"]}})',
				chatId: '123456',
				additionalFields: {},
			},
			credentials: {
				telegramApi: 'telegram',
			},
			typeVersion: 1,
		},
		shopify: {
			name: 'shopify',
			type: 'n8n-nodes-base.shopifyTrigger',
			position: [540, -110],
			webhookId: '2a7e0e50-8f09-4a2b-bf54-a849a6ac4fe0',
			parameters: {
				topic: 'products/create',
			},
			credentials: {
				shopifyApi: 'shopify',
			},
			typeVersion: 1,
		},
	} satisfies Record<string, IWorkflowTemplateNodeWithCredentials>;

	describe('groupNodeCredentialsByTypeAndName', () => {
		it('returns an empty array if there are no nodes', () => {
			expect(groupNodeCredentialsByKey([])).toEqual(new Map());
		});

		it('returns credentials grouped by type and name', () => {
			expect(groupNodeCredentialsByKey(Object.values(nodesByName))).toEqual(
				objToMap({
					'twitterOAuth1Api-twitter': {
						key: 'twitterOAuth1Api-twitter',
						credentialName: 'twitter',
						credentialType: 'twitterOAuth1Api',
						nodeTypeName: 'n8n-nodes-base.twitter',
						usedBy: [nodesByName.Twitter],
					},
					'telegramApi-telegram': {
						key: 'telegramApi-telegram',
						credentialName: 'telegram',
						credentialType: 'telegramApi',
						nodeTypeName: 'n8n-nodes-base.telegram',
						usedBy: [nodesByName.Telegram],
					},
					'shopifyApi-shopify': {
						key: 'shopifyApi-shopify',
						credentialName: 'shopify',
						credentialType: 'shopifyApi',
						nodeTypeName: 'n8n-nodes-base.shopifyTrigger',
						usedBy: [nodesByName.shopify],
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

			expect(groupNodeCredentialsByKey([node1, node2])).toEqual(
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
		});

		it('returns an empty object if there are no credential overrides', () => {
			// Setup
			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentialTypes([testData.credentialTypeTelegram]);
			const templatesStore = useTemplatesStore();
			templatesStore.addWorkflows([testData.fullShopifyTelegramTwitterTemplate]);

			const setupTemplateStore = useSetupTemplateStore();
			setupTemplateStore.setTemplateId(testData.fullShopifyTelegramTwitterTemplate.id.toString());

			expect(setupTemplateStore.credentialUsages.length).toBe(3);
			expect(setupTemplateStore.credentialOverrides).toEqual({});
		});

		it('returns overrides for one node', () => {
			// Setup
			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentialTypes([testData.credentialTypeTelegram]);
			credentialsStore.setCredentials([testData.credentialsTelegram1]);
			const templatesStore = useTemplatesStore();
			templatesStore.addWorkflows([testData.fullShopifyTelegramTwitterTemplate]);

			const setupTemplateStore = useSetupTemplateStore();
			setupTemplateStore.setTemplateId(testData.fullShopifyTelegramTwitterTemplate.id.toString());
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
		});

		it("selects no credentials when there isn't any available", () => {
			// Setup
			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentialTypes([testData.credentialTypeTelegram]);
			const templatesStore = useTemplatesStore();
			templatesStore.addWorkflows([testData.fullShopifyTelegramTwitterTemplate]);

			const setupTemplateStore = useSetupTemplateStore();
			setupTemplateStore.setTemplateId(testData.fullShopifyTelegramTwitterTemplate.id.toString());

			// Execute
			setupTemplateStore.setInitialCredentialSelection();

			expect(setupTemplateStore.selectedCredentialIdByKey).toEqual({});
		});

		it("selects credential when there's only one", () => {
			// Setup
			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentialTypes([testData.credentialTypeTelegram]);
			credentialsStore.setCredentials([testData.credentialsTelegram1]);
			const templatesStore = useTemplatesStore();
			templatesStore.addWorkflows([testData.fullShopifyTelegramTwitterTemplate]);

			const setupTemplateStore = useSetupTemplateStore();
			setupTemplateStore.setTemplateId(testData.fullShopifyTelegramTwitterTemplate.id.toString());

			// Execute
			setupTemplateStore.setInitialCredentialSelection();

			expect(setupTemplateStore.selectedCredentialIdByKey).toEqual({
				[keyFromCredentialTypeAndName('telegramApi', 'telegram_habot')]: 'YaSKdvEcT1TSFrrr1',
			});
		});

		it('selects no credentials when there are more than 1 available', () => {
			// Setup
			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentialTypes([testData.credentialTypeTelegram]);
			credentialsStore.setCredentials([
				testData.credentialsTelegram1,
				testData.credentialsTelegram2,
			]);
			const templatesStore = useTemplatesStore();
			templatesStore.addWorkflows([testData.fullShopifyTelegramTwitterTemplate]);

			const setupTemplateStore = useSetupTemplateStore();
			setupTemplateStore.setTemplateId(testData.fullShopifyTelegramTwitterTemplate.id.toString());

			// Execute
			setupTemplateStore.setInitialCredentialSelection();

			expect(setupTemplateStore.selectedCredentialIdByKey).toEqual({});
		});

		test.each([
			['httpBasicAuth'],
			['httpCustomAuth'],
			['httpDigestAuth'],
			['httpHeaderAuth'],
			['oAuth1Api'],
			['oAuth2Api'],
			['httpQueryAuth'],
		])('does not auto-select credentials for %s', (credentialType) => {
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
				parameters: {},
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
});
