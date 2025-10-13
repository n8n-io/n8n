import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

import { dataTableFilterSchema } from '../../schemas/data-table-filter.schema';
import { dataTableColumnNameSchema } from '../../schemas/data-table.schema';
import { paginationSchema } from '../pagination/pagination.dto';

const filterValidator = z
	.string()
	.optional()
	.transform((val, ctx) => {
		if (!val) return undefined;
		try {
			const parsed: unknown = jsonParse(val);
			try {
				return dataTableFilterSchema.parse(parsed);
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

const sortByValidator = z
	.string()
	.optional()
	.transform((val, ctx) => {
		if (val === undefined) return val;

		if (!val.includes(':')) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid sort format, expected <columnName>:<asc/desc>',
				path: ['sort'],
			});
			return z.NEVER;
		}

		let [column, direction] = val.split(':');

		try {
			column = dataTableColumnNameSchema.parse(column);
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid sort columnName',
				path: ['sort'],
			});
			return z.NEVER;
		}

		direction = direction?.toUpperCase();
		if (direction !== 'ASC' && direction !== 'DESC') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid sort direction',
				path: ['sort'],
			});

			return z.NEVER;
		}
		return [column, direction] as const;
	});

export class ListDataTableContentQueryDto extends Z.class({
	take: paginationSchema.take.optional(),
	skip: paginationSchema.skip.optional(),
	filter: filterValidator.optional(),
	sortBy: sortByValidator.optional(),
}) {}
