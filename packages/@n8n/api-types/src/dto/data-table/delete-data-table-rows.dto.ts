import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

import { dataTableFilterSchema } from '../../schemas/data-table-filter.schema';

const dataTableFilterQueryValidator = z.string().transform((val, ctx) => {
	if (!val) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Filter is required for delete operations',
			path: ['filter'],
		});
		return z.NEVER;
	}
	try {
		const parsed: unknown = jsonParse(val);
		try {
			// Parse with the schema which applies defaults
			const result = dataTableFilterSchema.parse(parsed);
			// Ensure filters array is not empty
			if (!result.filters || result.filters.length === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'At least one filter condition is required for delete operations',
					path: ['filter'],
				});
				return z.NEVER;
			}
			return result;
		} catch (e) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid filter fields',
				path: ['filter'],
			});
			return z.NEVER;
		}
	} catch (e) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Invalid filter format',
			path: ['filter'],
		});
		return z.NEVER;
	}
});

const booleanValidator = z
	.union([z.string(), z.boolean()])
	.optional()
	.transform((val) => {
		if (typeof val === 'string') {
			return val === 'true';
		}
		return val ?? false;
	});

const deleteDataTableRowsShape = {
	filter: dataTableFilterQueryValidator,
	returnData: booleanValidator,
	dryRun: booleanValidator,
};

export class DeleteDataTableRowsDto extends Z.class(deleteDataTableRowsShape) {}
