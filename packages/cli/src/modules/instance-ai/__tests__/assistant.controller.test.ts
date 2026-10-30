import type { InstanceAiAdminSettingsUpdateRequest, InstanceAiCredits } from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import { AssistantController } from '../assistant.controller';
import type { InstanceAiBrowserSessionService } from '../browser/instance-ai-browser-session.service';
import type { InstanceAiErrorReporterService } from '../instance-ai-error-reporter.service';
import type { InstanceAiModelCatalogService } from '../instance-ai-model-catalog.service';
import type { InstanceAiModelService } from '../instance-ai-model.service';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';

type ControllerClass = Parameters<ControllerRegistryMetadata['getControllerMetadata']>[0];

describe('AssistantController', () => {
	const settingsService = mock<InstanceAiSettingsService>();
	const modelService = mock<InstanceAiModelService>();
	const modelCatalogService = mock<InstanceAiModelCatalogService>();
	const browserSessionService = mock<InstanceAiBrowserSessionService>();
	const moduleRegistry = mock<ModuleRegistry>();
	const publisher = mock<Publisher>();
	const instanceAiErrorReporter = mock<InstanceAiErrorReporterService>();

	const controller = new AssistantController(
		settingsService,
		modelService,
		modelCatalogService,
		browserSessionService,
		moduleRegistry,
		publisher,
		instanceAiErrorReporter,
	);

	const req = mock<AuthenticatedRequest>({ user: { id: 'user-1' } });
	const res = mock<Response>();

	const registry = Container.get(ControllerRegistryMetadata);
	const scopeOf = (handlerName: string) =>
		registry.getRouteMetadata(AssistantController as unknown as ControllerClass, handlerName)
			.accessScope;

	beforeEach(() => {
		vi.clearAllMocks();
		settingsService.isInstanceAiEnabled.mockReturnValue(true);
	});

	it('serves the routes under /assistant', () => {
		const metadata = registry.getControllerMetadata(
			AssistantController as unknown as ControllerClass,
		);
		expect(metadata.basePath).toBe('/assistant');
	});

	it.each([
		'getAdminSettings',
		'getModelCatalog',
		'updateAdminSettings',
		'verifyModel',
		'verifySandbox',
		'verifySearch',
		'listServiceCredentials',
		'listInstanceModelCredentials',
	])('should require instanceAi:manage scope for %s', (handlerName) => {
		expect(scopeOf(handlerName)).toEqual({ scope: 'instanceAi:manage', globalOnly: true });
	});

	describe('getCredits', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('getCredits')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should return the credits of the user', async () => {
			const credits = mock<InstanceAiCredits>();
			modelService.getCredits.mockResolvedValue(credits);

			await expect(controller.getCredits(req)).resolves.toBe(credits);
			expect(modelService.getCredits).toHaveBeenCalledWith(req.user);
		});

		it('should reject when the Assistant is disabled', async () => {
			settingsService.isInstanceAiEnabled.mockReturnValue(false);

			await expect(controller.getCredits(req)).rejects.toThrow(ForbiddenError);
			expect(modelService.getCredits).not.toHaveBeenCalled();
		});
	});

	describe('getModelCatalog', () => {
		it('should return the model catalog service response', async () => {
			const response = { models: { anthropic: [], openai: [], openrouter: [] } };
			modelCatalogService.getModels.mockResolvedValue(response);

			await expect(controller.getModelCatalog(req)).resolves.toEqual(response);
		});
	});

	describe('updateAdminSettings', () => {
		it('should shut down browser sessions when enabled is set to false', async () => {
			settingsService.updateAdminSettings.mockResolvedValue({
				enabled: false,
				browserUseEnabled: true,
			} as never);
			const payload = { enabled: false } as InstanceAiAdminSettingsUpdateRequest;

			await controller.updateAdminSettings(req, res, payload);

			expect(browserSessionService.shutdown).toHaveBeenCalled();
		});

		it('should not shut down browser sessions when enabling features', async () => {
			settingsService.updateAdminSettings.mockResolvedValue({
				enabled: true,
				browserUseEnabled: true,
			} as never);
			const payload = {
				enabled: true,
				browserUseEnabled: true,
			} as InstanceAiAdminSettingsUpdateRequest;

			await controller.updateAdminSettings(req, res, payload);

			expect(browserSessionService.shutdown).not.toHaveBeenCalled();
		});

		it('should publish settings reloads and refresh affected module settings', async () => {
			settingsService.updateAdminSettings.mockResolvedValue({ enabled: true } as never);

			await controller.updateAdminSettings(req, res, { enabled: true });

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'reload-instance-ai-settings',
			});
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('instance-ai');
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('agents');
		});

		it('should publish and attempt every local side effect when one fails', async () => {
			const refreshError = new Error('refresh failed');
			settingsService.updateAdminSettings.mockResolvedValue({
				enabled: false,
				browserUseEnabled: false,
			} as never);
			moduleRegistry.refreshModuleSettings.mockRejectedValueOnce(refreshError);

			await expect(
				controller.updateAdminSettings(req, res, { enabled: false }),
			).resolves.toBeDefined();
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'reload-instance-ai-settings',
			});
			expect(browserSessionService.shutdown).toHaveBeenCalled();
			expect(instanceAiErrorReporter.report).toHaveBeenCalledWith(refreshError, {
				component: 'settings-side-effects',
				threadId: 'admin-settings',
			});
		});

		it('should report a publish failure after applying committed settings', async () => {
			const committedSettings = {
				enabled: false,
				browserUseEnabled: false,
			};
			const publishError = new Error('publish failed');
			settingsService.updateAdminSettings.mockResolvedValue(committedSettings as never);
			publisher.publishCommand.mockRejectedValue(publishError);

			await expect(controller.updateAdminSettings(req, res, { enabled: false })).resolves.toBe(
				committedSettings,
			);
			expect(instanceAiErrorReporter.report).toHaveBeenCalledWith(publishError, {
				component: 'settings-publish',
				threadId: 'admin-settings',
			});
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('instance-ai');
			expect(browserSessionService.shutdown).toHaveBeenCalled();
		});
	});

	describe('reloadAdminSettings', () => {
		it('should apply side effects from the reloaded local flags', async () => {
			settingsService.isInstanceAiEnabled.mockReturnValue(false);
			settingsService.isBrowserUseEnabled.mockReturnValue(false);

			await controller.reloadAdminSettings();

			expect(settingsService.reloadFromDb).toHaveBeenCalled();
			expect(settingsService.getAdminSettings).not.toHaveBeenCalled();
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('instance-ai');
			expect(browserSessionService.shutdown).toHaveBeenCalled();
		});
	});
});
