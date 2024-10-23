import type { Response } from 'express';
import Container from 'typedi';

import { VariablesRepository } from '@/databases/repositories/variables.repository';
import { VariablesController } from '@/environments/variables/variables.controller.ee';
import { VariablesService } from '@/environments/variables/variables.service.ee';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { VariableCountLimitReachedError } from '@/errors/variable-count-limit-reached.error';
import { VariableValidationError } from '@/errors/variable-validation.error';
import type { PaginatedRequest } from '@/public-api/types';
import type { VariablesRequest } from '@/requests';

import { globalScope, isLicensed, validCursor } from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

type Create = VariablesRequest.Create;
type Delete = VariablesRequest.Delete;
type GetAll = PaginatedRequest;

export = {
	createVariable: [
		isLicensed('feat:variables'),
		globalScope('variable:create'),
		async (req: Create, res: Response) => {
			delete req.body.id;
			try {
				Container.get(VariablesService).validateVariable(req.body);
				await Container.get(VariablesService).create(req.body, req.user);
			} catch (error) {
				if (error instanceof VariableCountLimitReachedError) {
					throw new BadRequestError(error.message);
				} else if (error instanceof VariableValidationError) {
					throw new BadRequestError(error.message);
				}
				throw error;
			}

			res.status(201).send();
		},
	],
	deleteVariable: [
		isLicensed('feat:variables'),
		globalScope('variable:delete'),
		async (req: Delete, res: Response) => {
			await Container.get(VariablesController).deleteVariable(req);

			res.status(204).send();
		},
	],
	getVariables: [
		isLicensed('feat:variables'),
		globalScope('variable:list'),
		validCursor,
		async (req: GetAll, res: Response) => {
			const { offset = 0, limit = 100 } = req.query;

			const [variables, count] = await Container.get(VariablesRepository).findAndCount({
				skip: offset,
				take: limit,
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
