import { jsonParse } from 'n8n-workflow';
import { handleListQueryError } from './error';
import { WorkflowSchema } from './workflow.schema';
import type { ListQueryRequest } from '@/requests';
import type { RequestHandler } from 'express';
import type { Schema } from './schema';

function toQueryFilter(rawFilter: string, schema: typeof Schema) {
	const { tags, ...rest } = new schema(
		jsonParse(rawFilter, { errorMessage: 'Failed to parse filter JSON' }),
	) as WorkflowSchema;

	const parsedFilter: Record<string, unknown> = Object.fromEntries(
		Object.entries(rest)
			.filter(([_, value]) => value !== undefined)
			.map(([key, _]: [keyof Schema, unknown]) => [key, rest[key]]),
	);

	if (tags) {
		parsedFilter.tags = tags.map((tag: string) => ({ name: tag }));
	}

	console.log('tags', tags);

	return parsedFilter;
}

export const filterListQueryMiddleware: RequestHandler = (req: ListQueryRequest, res, next) => {
	const { filter: rawFilter } = req.query;

	if (!rawFilter) return next();

	let schema;

	if (req.baseUrl.endsWith('workflows')) {
		schema = WorkflowSchema;
	} else {
		return next();
	}

	try {
		const filter = toQueryFilter(rawFilter, schema);

		if (Object.keys(filter).length === 0) return next();

		req.listQueryOptions = { ...req.listQueryOptions, filter };

		next();
	} catch (error) {
		handleListQueryError('filter', rawFilter, error);
	}
};
