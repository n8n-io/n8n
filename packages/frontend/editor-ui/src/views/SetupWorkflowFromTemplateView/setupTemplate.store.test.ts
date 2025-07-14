import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { mock } from 'vitest-mock-extended';
import type { ICredentialType } from 'n8n-workflow';

import type { ICredentialsResponse } from '@/Interface';
import type {
	ITemplatesWorkflowFull,
	IWorkflowTemplateNode,
} from '@n8n/rest-api-client/api/templates';
import { useTemplatesStore } from '@/stores/templates.store';
import { keyFromCredentialTypeAndName } from '@/utils/templates/templateTransforms';
import { useSetupTemplateStore } from '@/views/SetupWorkflowFromTemplateView/setupTemplate.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

import {
	nodeTypeHttpRequest,
	nodeTypeNextCloud,
	nodeTypeReadImap,
	nodeTypeTelegram,
	nodeTypeTwitter,
} from '@/utils/testData/nodeTypeTestData';
import * as testData from './__tests__/setupTemplate.store.testData';

const mockCredentialsResponse = (id: string) =>
	mock<ICredentialsResponse>({
		id,
		name: 'Telegram account',
		type: 'telegramApi',
	});

const mockCredentialType = (name: string) => mock<ICredentialType>({ name });

const mockTemplateNode = (name: string, type: string) =>
	mock<IWorkflowTemplateNode>({
		name,
		type,
		typeVersion: 1,
		position: [0, 0],
	});

const testTemplate1 = mock<ITemplatesWorkflowFull>({
	id: 1,
	workflow: {
		nodes: [
			mockTemplateNode('IMAP Email', 'n8n-nodes-base.emailReadImap'),
			mockTemplateNode('Nextcloud', 'n8n-nodes-base.nextCloud'),
		],
	},
	full: true,
});

const testTemplate2 = mock<ITemplatesWorkflowFull>({
	id: 2,
	workflow: {
		nodes: [
			{
				...mockTemplateNode('Telegram', 'n8n-nodes-base.telegram'),
				credentials: {
					telegramApi: 'telegram_habot',
				},
			},
		],
	},
	full: true,
});

describe('SetupWorkflowFromTemplateView store', () => {
	describe('setInitialCredentialsSelection', () => {
		beforeEach(() => {
			setActivePinia(
				createTestingPinia({
					stubActions: false,
				}),
			);

			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentialTypes([mockCredentialType('telegramApi')]);
			const templatesStore = useTemplatesStore();
			templatesStore.addWorkflows([testTemplate2]);
			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.setNodeTypes([nodeTypeTelegram, nodeTypeTwitter, nodeTypeHttpRequest]);
			const setupTemplateStore = useSetupTemplateStore();
			setupTemplateStore.setTemplateId(testTemplate2.id.toString());
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
			const credentialId = 'YaSKdvEcT1TSFrrr1';
			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentials([mockCredentialsResponse(credentialId)]);

			const setupTemplateStore = useSetupTemplateStore();

			// Execute
			setupTemplateStore.setInitialCredentialSelection();

			expect(setupTemplateStore.selectedCredentialIdByKey).toEqual({
				[keyFromCredentialTypeAndName('telegramApi', 'telegram_habot')]: credentialId,
			});
		});

		it('should select no credentials when there are more than 1 available', () => {
			// Setup
			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentials([mockCredentialsResponse('1'), mockCredentialsResponse('2')]);

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
			credentialsStore.setCredentialTypes([mockCredentialType(credentialType)]);
			credentialsStore.setCredentials([
				testData.newCredential({
					name: `${credentialType}Credential`,
					type: credentialType,
				}),
			]);

			const templatesStore = useTemplatesStore();
			const workflow = testData.newFullOneNodeTemplate({
				id: 'workflow',
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
			credentialsStore.setCredentialTypes([mockCredentialType('telegramApi')]);
			const templatesStore = useTemplatesStore();
			templatesStore.addWorkflows([testTemplate1]);
			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.setNodeTypes([nodeTypeReadImap, nodeTypeNextCloud]);
			const setupTemplateStore = useSetupTemplateStore();
			setupTemplateStore.setTemplateId(testTemplate1.id.toString());
		});

		const templateImapNode = testTemplate1.workflow.nodes[0];
		const templateNextcloudNode = testTemplate1.workflow.nodes[1];

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
