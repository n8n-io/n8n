import { handleListQueryError } from './error';
import { jsonParse } from 'n8n-workflow';
import { WorkflowSchema } from './workflow.schema';
import * as utils from '@/utils';
import type { ListQueryRequest } from '@/requests';
import type { RequestHandler } from 'express';
import type { Schema } from '@/middlewares/listQuery/schema';

function toQuerySelect(rawSelect: string, schema: typeof Schema) {
	const asArr = jsonParse(rawSelect, { errorMessage: 'Failed to parse select JSON' });

	if (!utils.isStringArray(asArr)) {
		throw new Error('Parsed select is not a string array');
	}

	return asArr.reduce<Record<string, true>>((acc, field) => {
		if (!schema.fieldNames.includes(field)) return acc;
		return (acc[field] = true), acc;
	}, {});
}

export const selectListQueryMiddleware: RequestHandler = (req: ListQueryRequest, res, next) => {
	const { select: rawSelect } = req.query;

	if (!rawSelect) return next();

	let schema;

	if (req.baseUrl.endsWith('workflows')) {
		schema = WorkflowSchema;
	} else {
		return next();
	}

	try {
		const select = toQuerySelect(rawSelect, schema);

		if (Object.keys(select).length === 0) return next();

		req.listQueryOptions = { ...req.listQueryOptions, select };

		next();
	} catch (error) {
		handleListQueryError('select', rawSelect, error);
	}
};
