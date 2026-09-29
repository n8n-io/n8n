import { TestOtelTraceDto } from '@n8n/api-types';
import { Container } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';

import { OtelSettingsService } from '@/modules/otel/otel-settings.service';
import { OtelService } from '@/modules/otel/otel.service';

import type { OtelSettingsRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { apiKeyHasScopeWithGlobalScopeFallback } from '../../shared/middlewares/global.middleware';

type OtelHandlers = {
	testOtelTrace: PublicAPIEndpoint<OtelSettingsRequest.Test>;
};

const otelHandlers: OtelHandlers = {
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
