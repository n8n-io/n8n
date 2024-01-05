import { useTemplatesStore } from '@/stores/templates.store';
import { keyFromCredentialTypeAndName } from '@/utils/templates/templateTransforms';
import { useSetupTemplateStore } from '@/views/SetupWorkflowFromTemplateView/setupTemplate.store';
import { setActivePinia } from 'pinia';
import * as testData from './setupTemplate.store.testData';
import { createTestingPinia } from '@pinia/testing';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

describe('SetupWorkflowFromTemplateView store', () => {
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
