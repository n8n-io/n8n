import { VIEWS } from '@/constants';
import { Telemetry } from '@/plugins/telemetry';
import type { NodeTypesStore } from '@/stores/nodeTypes.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { PosthogStore } from '@/stores/posthog.store';
import { usePostHog } from '@/stores/posthog.store';
import type { TemplatesStore } from '@/stores/templates.store';
import { useTemplatesStore } from '@/stores/templates.store';
import { useTemplateWorkflow } from '@/utils/templates/templateActions';
import {
	nodeTypeRespondToWebhookV1,
	nodeTypeShopifyTriggerV1,
	nodeTypeTelegramV1,
	nodeTypeTwitterV1,
	nodeTypeWebhookV1,
	nodeTypeWebhookV1_1,
	nodeTypesSet,
} from '@/utils/testData/nodeTypeTestData';
import {
	fullCreateApiEndpointTemplate,
	fullShopifyTelegramTwitterTemplate,
} from '@/utils/testData/templateTestData';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { vi } from 'vitest';
import type { Router } from 'vue-router';

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
		let posthogStore: PosthogStore;
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
			posthogStore = usePostHog();
			templatesStore = useTemplatesStore();
		});

		describe('When feature flag is disabled', () => {
			const templateId = '1';

			beforeEach(async () => {
				posthogStore.isFeatureEnabled = vi.fn().mockReturnValue(false);

				await useTemplateWorkflow({
					externalHooks,
					posthogStore,
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

		describe('When feature flag is enabled and template has nodes requiring credentials', () => {
			const templateId = fullShopifyTelegramTwitterTemplate.id.toString();

			beforeEach(async () => {
				posthogStore.isFeatureEnabled = vi.fn().mockReturnValue(true);
				templatesStore.addWorkflows([fullShopifyTelegramTwitterTemplate]);
				nodeTypesStore.setNodeTypes([
					nodeTypeTelegramV1,
					nodeTypeTwitterV1,
					nodeTypeShopifyTriggerV1,
				]);
				vi.spyOn(nodeTypesStore, 'loadNodeTypesIfNotLoaded').mockResolvedValue();

				await useTemplateWorkflow({
					externalHooks,
					posthogStore,
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

		describe("When feature flag is enabled and template doesn't have nodes requiring credentials", () => {
			const templateId = fullCreateApiEndpointTemplate.id.toString();

			beforeEach(async () => {
				posthogStore.isFeatureEnabled = vi.fn().mockReturnValue(true);
				templatesStore.addWorkflows([fullCreateApiEndpointTemplate]);
				nodeTypesStore.setNodeTypes([
					nodeTypeWebhookV1,
					nodeTypeWebhookV1_1,
					nodeTypeRespondToWebhookV1,
					...Object.values(nodeTypesSet),
				]);
				vi.spyOn(nodeTypesStore, 'loadNodeTypesIfNotLoaded').mockResolvedValue();

				await useTemplateWorkflow({
					externalHooks,
					posthogStore,
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
