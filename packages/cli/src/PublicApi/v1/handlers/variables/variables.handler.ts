import { globalScope, validCursor } from '../../shared/middlewares/global.middleware';
import type { Response } from 'express';
import type { VariablesRequest } from '@/requests';

type Create = VariablesRequest.Create;
type Delete = VariablesRequest.Delete;
type GetAll = VariablesRequest.PublicApiGetAll;

export = {
	createVariable: [
		globalScope('variable:create'),
		async (req: Create, res: Response) => {
			// ...
		},
	],
	deleteVariable: [
		globalScope('variable:delete'),
		async (req: Delete, res: Response) => {
			// ...
		},
	],
	getVariables: [
		globalScope('variable:list'),
		validCursor,
		async (req: GetAll, res: Response) => {
			// ...
		},
	],
};
