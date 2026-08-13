import { CreateVariableRequestDto, UpdateVariableRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';

import { VariablesController } from '@/environments.ee/variables/variables.controller.ee';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { VariablesRequest } from '@/requests';

import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { paginateArray } from '../../shared/services/pagination.service';

type VariablesHandlers = {
	createVariable: PublicAPIEndpoint<AuthenticatedRequest>;
	updateVariable: PublicAPIEndpoint<AuthenticatedRequest<{ id: string }>>;
	deleteVariable: PublicAPIEndpoint<AuthenticatedRequest<{ id: string }>>;
	getVariables: PublicAPIEndpoint<VariablesRequest.GetAll>;
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
			await Container.get(VariablesController).createVariable(req, res, payload.data);

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
			await Container.get(VariablesController).updateVariable(req, res, payload.data);

			return res.status(204).send();
		},
	],
	deleteVariable: [
		isLicensed('feat:variables'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'variable:delete' }),
		async (req, res) => {
			await Container.get(VariablesController).deleteVariable(req);

			return res.status(204).send();
		},
	],
	getVariables: [
		isLicensed('feat:variables'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'variable:list' }),
		validCursor,
		async (req, res) => {
			const { offset = 0, limit = 100, projectId, state } = req.query;

			const variables = await Container.get(VariablesService).getAllForUser(req.user, {
				state,
				projectId: projectId === 'null' ? null : projectId,
			});

			return res.json(paginateArray(variables, { offset, limit }));
		},
	],
};

export = variablesHandlers;
