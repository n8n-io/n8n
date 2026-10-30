import {
	InstanceAiAdminSettingsUpdateRequest,
	InstanceAiVerifyModelRequest,
	InstanceAiVerifySandboxRequest,
	InstanceAiVerifySearchRequest,
} from '@n8n/api-types';
import type { InstanceAiAdminSettingsResponse } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import { Body, Get, GlobalScope, OnPubSubEvent, Post, Put, RestController } from '@n8n/decorators';
import { ForbiddenError } from '@n8n/errors';
import type { Response } from 'express';

import { InstanceAiBrowserSessionService } from './browser/instance-ai-browser-session.service';
import { InstanceAiErrorReporterService } from './instance-ai-error-reporter.service';
import { InstanceAiModelCatalogService } from './instance-ai-model-catalog.service';
import { InstanceAiModelService } from './instance-ai-model.service';
import { InstanceAiSettingsService } from './instance-ai-settings.service';
import { InstanceAiVerificationService } from './instance-ai-verification.service';

import { Publisher } from '@/scaling/pubsub/publisher.service';

/**
 * Routes that both Assistant runtimes use: the settings and the credits. This
 * controller loads always, with the instance-ai module, so it must not depend
 * on the agents module. Routes that only the Assistant agent uses go in
 * `AssistantAgentController`, which serves the same base path.
 */
@RestController('/assistant')
export class AssistantController {
	constructor(
		private readonly settingsService: InstanceAiSettingsService,
		private readonly modelService: InstanceAiModelService,
		private readonly modelCatalogService: InstanceAiModelCatalogService,
		private readonly browserSessionService: InstanceAiBrowserSessionService,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly publisher: Publisher,
		private readonly instanceAiErrorReporter: InstanceAiErrorReporterService,
	) {}

	// ── Credits ──────────────────────────────────────────────────────────────

	@Get('/credits')
	@GlobalScope('instanceAi:message')
	async getCredits(req: AuthenticatedRequest) {
		if (!this.settingsService.isInstanceAiEnabled()) {
			throw new ForbiddenError('Instance AI is disabled');
		}
		return await this.modelService.getCredits(req.user);
	}

	// ── Admin settings (owner/admin only) ──────────────────────────────────

	@Get('/settings')
	@GlobalScope('instanceAi:manage')
	async getAdminSettings(_req: AuthenticatedRequest) {
		return await this.settingsService.getAdminSettings();
	}

	@Get('/settings/models')
	@GlobalScope('instanceAi:manage')
	async getModelCatalog(_req: AuthenticatedRequest) {
		return await this.modelCatalogService.getModels();
	}

	@Put('/settings')
	@GlobalScope('instanceAi:manage')
	async updateAdminSettings(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiAdminSettingsUpdateRequest,
	) {
		const result = await this.settingsService.updateAdminSettings(payload, req.user);
		const [publishResult] = await Promise.allSettled([
			this.publisher.publishCommand({ command: 'reload-instance-ai-settings' }),
			this.applyAdminSettingsSideEffects(result),
		]);

		if (publishResult.status === 'rejected') {
			this.instanceAiErrorReporter.report(publishResult.reason, {
				component: 'settings-publish',
				threadId: 'admin-settings',
			});
		}

		return result;
	}

	@Post('/settings/verify/model')
	@GlobalScope('instanceAi:manage')
	async verifyModel(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiVerifyModelRequest,
	) {
		return await Container.get(InstanceAiVerificationService).verifyModel(req.user, payload);
	}

	@Post('/settings/verify/sandbox')
	@GlobalScope('instanceAi:manage')
	async verifySandbox(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiVerifySandboxRequest,
	) {
		return await Container.get(InstanceAiVerificationService).verifySandbox(req.user, payload);
	}

	@Post('/settings/verify/search')
	@GlobalScope('instanceAi:manage')
	async verifySearch(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiVerifySearchRequest,
	) {
		return await Container.get(InstanceAiVerificationService).verifySearch(payload);
	}

	@Get('/settings/service-credentials')
	@GlobalScope('instanceAi:manage')
	async listServiceCredentials(_req: AuthenticatedRequest) {
		return await this.settingsService.listInstanceServiceCredentials();
	}

	@Get('/settings/model-credentials')
	@GlobalScope('instanceAi:manage')
	async listInstanceModelCredentials(_req: AuthenticatedRequest) {
		return await this.settingsService.listInstanceModelCredentials();
	}

	@OnPubSubEvent('reload-instance-ai-settings', { instanceType: 'main' })
	async reloadAdminSettings() {
		await this.settingsService.reloadFromDb();
		await this.applyAdminSettingsSideEffects({
			enabled: this.settingsService.isInstanceAiEnabled(),
			browserUseEnabled: this.settingsService.isBrowserUseEnabled(),
		});
	}

	private async applyAdminSettingsSideEffects(
		settings: Pick<InstanceAiAdminSettingsResponse, 'enabled' | 'browserUseEnabled'>,
	) {
		const sideEffects: Array<() => Promise<void> | void> = [
			async () => {
				await this.moduleRegistry.refreshModuleSettings('instance-ai');
			},
			async () => {
				await this.moduleRegistry.refreshModuleSettings('agents');
			},
		];
		if (!settings.enabled || !settings.browserUseEnabled) {
			sideEffects.push(async () => await this.browserSessionService.shutdown());
		}

		const results = await Promise.allSettled(sideEffects.map(async (apply) => await apply()));
		for (const result of results) {
			if (result.status === 'rejected') {
				this.instanceAiErrorReporter.report(result.reason, {
					component: 'settings-side-effects',
					threadId: 'admin-settings',
				});
			}
		}
	}
}
