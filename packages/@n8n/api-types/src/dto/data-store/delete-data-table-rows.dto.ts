import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

import { dataTableFilterSchema } from '../../schemas/data-table-filter.schema';

const dataTableFilterQueryValidator = z
	.string()
	.optional()
	.transform((val, ctx) => {
		if (!val) return undefined;
		try {
			const parsed: unknown = jsonParse(val);
			try {
				// Parse with the schema which applies defaults
				const result = dataTableFilterSchema.parse(parsed);
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

const returnDataValidator = z
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
	returnData: returnDataValidator,
};

export class DeleteDataTableRowsDto extends Z.class(deleteDataTableRowsShape) {}
