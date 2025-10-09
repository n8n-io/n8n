import type { Router } from 'vue-router';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { VIEWS } from '@/constants';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client/api/templates';
import { Telemetry } from '@/plugins/telemetry';
import type { NodeTypesStore } from '@/stores/nodeTypes.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { TemplatesStore } from '@/features/templates/templates.store';
import { useTemplatesStore } from '@/features/templates/templates.store';
import { useTemplateWorkflow } from './templateActions';
import { nodeTypeTelegram } from '@/utils/testData/nodeTypeTestData';

const testTemplate1 = mock<ITemplatesWorkflowFull>({
	id: 1,
	workflow: {
		nodes: [],
	},
	full: true,
});

export const testTemplate2 = mock<ITemplatesWorkflowFull>({
	id: 2,
	workflow: {
		nodes: [
			{
				name: 'Telegram',
				type: 'n8n-nodes-base.telegram',
				typeVersion: 1,
				position: [0, 0],
				credentials: {
					telegramApi: 'telegram_habot',
				},
			},
		],
	},
	full: true,
});

describe('templateActions', () => {
	describe('useTemplateWorkflow', () => {
		const telemetry = new Telemetry();
		const externalHooks = {
			run: vi.fn(),
		};
		const router: Router = {
			push: vi.fn(),
			resolve: vi.fn(),
		} as unknown as Router;
		let nodeTypesStore: NodeTypesStore;
		let templatesStore: TemplatesStore;

		beforeEach(() => {
			vi.resetAllMocks();
			setActivePinia(
				createTestingPinia({
					stubActions: false,
				}),
			);

			vi.spyOn(telemetry, 'track').mockImplementation(() => {});
			nodeTypesStore = useNodeTypesStore();
			templatesStore = useTemplatesStore();
		});

		describe('When template has nodes requiring credentials', () => {
			const templateId = testTemplate2.id.toString();

			beforeEach(async () => {
				templatesStore.addWorkflows([testTemplate2]);
				nodeTypesStore.setNodeTypes([nodeTypeTelegram]);
				vi.spyOn(nodeTypesStore, 'loadNodeTypesIfNotLoaded').mockResolvedValue();

				await useTemplateWorkflow({
					externalHooks,
					nodeTypesStore,
					telemetry,
					templateId,
					templatesStore,
					router,
					source: 'workflow',
				});
			});

			it('should navigate to correct url', async () => {
				expect(router.push).toHaveBeenCalledWith({
					name: VIEWS.TEMPLATE_SETUP,
					params: { id: templateId },
				});
			});
		});

		describe("When template doesn't have nodes requiring credentials", () => {
			const templateId = testTemplate1.id.toString();

			beforeEach(async () => {
				templatesStore.addWorkflows([testTemplate1]);
				vi.spyOn(nodeTypesStore, 'loadNodeTypesIfNotLoaded').mockResolvedValue();

				await useTemplateWorkflow({
					externalHooks,
					nodeTypesStore,
					telemetry,
					templateId,
					templatesStore,
					router,
					source: 'workflow',
				});
			});

			it('should navigate to correct url', async () => {
				expect(router.push).toHaveBeenCalledWith({
					name: VIEWS.TEMPLATE_IMPORT,
					params: { id: templateId },
				});
			});
		});
	});
});
