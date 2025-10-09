import { CreateVariableRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { VariablesRepository } from '@n8n/db';
import { Container } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { IsNull } from '@n8n/typeorm';
import type { Response } from 'express';

import {
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

import { VariablesController } from '@/environments.ee/variables/variables.controller.ee';
import type { VariablesRequest } from '@/requests';

export = {
	createVariable: [
		isLicensed('feat:variables'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'variable:create' }),
		async (req: AuthenticatedRequest, res: Response) => {
			const payload = CreateVariableRequestDto.safeParse(req.body);
			if (payload.error) {
				return res.status(400).json(payload.error.errors[0]);
			}
			await Container.get(VariablesController).createVariable(req, res, payload.data);

			return res.status(201).send();
		},
	],
	updateVariable: [
		isLicensed('feat:variables'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'variable:update' }),
		async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
			const payload = CreateVariableRequestDto.safeParse(req.body);
			if (payload.error) {
				return res.status(400).json(payload.error.errors[0]);
			}
			await Container.get(VariablesController).updateVariable(req, res, payload.data);

			return res.status(204).send();
		},
	],
	deleteVariable: [
		isLicensed('feat:variables'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'variable:delete' }),
		async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
			await Container.get(VariablesController).deleteVariable(req);

			return res.status(204).send();
		},
	],
	getVariables: [
		isLicensed('feat:variables'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'variable:list' }),
		validCursor,
		async (req: VariablesRequest.GetAll, res: Response) => {
			const { offset = 0, limit = 100, projectId, state } = req.query;

			const [variables, count] = await Container.get(VariablesRepository).findAndCount({
				skip: offset,
				take: limit,
				where: {
					project: projectId === 'null' ? IsNull() : { id: projectId },
					value: state === 'empty' ? '' : undefined,
				},
				relations: ['project'],
			});

			return res.json({
				data: variables,
				nextCursor: encodeNextCursor({
					offset,
					limit,
					numberOfTotalRecords: count,
				}),
			});
		},
	],
};
