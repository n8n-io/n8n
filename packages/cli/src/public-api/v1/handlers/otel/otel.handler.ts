import { TestOtelTraceDto, UpdateOtelSettingsDto } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { OtelLifecycleHandler } from '@/modules/otel/otel-lifecycle-handler';
import { OtelSettingsService } from '@/modules/otel/otel-settings.service';
import { OtelService } from '@/modules/otel/otel.service';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { toOtelSettingsResponse } from './otel.mapper';
import type { OtelSettingsRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { apiKeyHasScopeWithGlobalScopeFallback } from '../../shared/middlewares/global.middleware';

type OtelHandlers = {
	getOtelSettings: PublicAPIEndpoint<OtelSettingsRequest.Get>;
	updateOtelSettings: PublicAPIEndpoint<OtelSettingsRequest.Update>;
	testOtelTrace: PublicAPIEndpoint<OtelSettingsRequest.Test>;
};

const otelHandlers: OtelHandlers = {
	getOtelSettings: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'otel:manage' }),
		async (_req, res) => {
			const settings = await Container.get(OtelSettingsService).loadSettings();

			return res.json(toOtelSettingsResponse(settings));
		},
	],

	updateOtelSettings: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'otel:manage' }),
		async (req, res) => {
			const payload = UpdateOtelSettingsDto.safeParse(req.body);
			if (!payload.success) {
				throw new BadRequestError(payload.error.errors[0]?.message ?? 'Invalid request body');
			}

			const settingsService = Container.get(OtelSettingsService);

			// Fields managed via environment variables are read-only: the UI greys them
			// out, so reject any attempt to change one here instead of silently ignoring
			// it. Re-submitting a field's current (env-enforced) value is not a change,
			// so a GET -> edit -> PUT round-trip still succeeds.
			await settingsService.loadSettings();
			const current = settingsService.getSettings();
			const conflicts = current.envManagedFields.filter(
				(key) => payload.data[key] !== current[key],
			);
			if (conflicts.length > 0) {
				throw new ConflictError(
					`The following field(s) are managed by environment variables and cannot be changed through the API: ${conflicts.join(', ')}`,
				);
			}

			await settingsService.saveSettings(payload.data);

			await Container.get(OtelLifecycleHandler).onReloadOtelConfig();
			await Container.get(ModuleRegistry).refreshModuleSettings('otel');
			void Container.get(Publisher).publishCommand({ command: 'reload-otel-config' });

			return res.json(toOtelSettingsResponse(settingsService.getSettings()));
		},
	],

	testOtelTrace: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'otel:manage' }),
		async (req, res) => {
			const payload = TestOtelTraceDto.safeParse(req.body);
			if (!payload.success) {
				throw new BadRequestError(payload.error.errors[0]?.message ?? 'Invalid request body');
			}

			const settingsService = Container.get(OtelSettingsService);
			const connection = settingsService.resolveTestConnection(payload.data);
			const result = await Container.get(OtelService).sendTestTrace(connection);

			return res.json(result);
		},
	],
};

export = otelHandlers;
