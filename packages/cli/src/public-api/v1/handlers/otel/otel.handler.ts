import { TestOtelTraceDto } from '@n8n/api-types';
import { Container } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { OtelSettingsService } from '@/modules/otel/otel-settings.service';
import { OtelService } from '@/modules/otel/otel.service';

import { toOtelSettingsResponse } from './otel.mapper';
import type { OtelSettingsRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { apiKeyHasScopeWithGlobalScopeFallback } from '../../shared/middlewares/global.middleware';

type OtelHandlers = {
	getOtelSettings: PublicAPIEndpoint<OtelSettingsRequest.Get>;
	testOtelTrace: PublicAPIEndpoint<OtelSettingsRequest.Test>;
};

const otelHandlers: OtelHandlers = {
	getOtelSettings: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'otel:manage' }),
		async (_req, res) => {
			const settingsService = Container.get(OtelSettingsService);
			await settingsService.loadSettings();

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
