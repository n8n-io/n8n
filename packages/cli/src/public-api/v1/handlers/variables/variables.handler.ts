import { CreateVariableRequestDto, UpdateVariableRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';

import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
} from '../../shared/middlewares/global.middleware';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

type VariablesHandlers = {
	createVariable: PublicAPIEndpoint<AuthenticatedRequest>;
	updateVariable: PublicAPIEndpoint<AuthenticatedRequest<{ id: string }>>;
	deleteVariable: PublicAPIEndpoint<AuthenticatedRequest<{ id: string }>>;
};

const variablesHandlers: VariablesHandlers = {
	createVariable: [
		isLicensed('feat:variables'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'variable:create' }),
		async (req, res) => {
			const payload = CreateVariableRequestDto.safeParse(req.body);
			if (payload.error) {
				throw new BadRequestError(payload.error.errors[0]?.message ?? 'Invalid request body');
			}
			await Container.get(VariablesService).create(req.user, payload.data);

			return res.status(201).send();
		},
	],
	updateVariable: [
		isLicensed('feat:variables'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'variable:update' }),
		async (req, res) => {
			const payload = UpdateVariableRequestDto.safeParse(req.body);
			if (payload.error) {
				throw new BadRequestError(payload.error.errors[0]?.message ?? 'Invalid request body');
			}
			await Container.get(VariablesService).update(req.user, req.params.id, payload.data);

			return res.status(204).send();
		},
	],
	deleteVariable: [
		isLicensed('feat:variables'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'variable:delete' }),
		async (req, res) => {
			await Container.get(VariablesService).deleteForUser(req.user, req.params.id);

			return res.status(204).send();
		},
	],
};

export = variablesHandlers;
