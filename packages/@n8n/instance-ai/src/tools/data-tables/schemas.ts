/** Zod pieces that the data table tools share. */
import { z } from 'zod';

export const projectIdDescribe =
	"Project ID. Scopes list (defaults to this conversation's project); for id-based actions, disambiguates when `dataTableId` is a name found in multiple accessible projects. Ignored when `dataTableId` is a UUID.";

export const dataTableNameDescribe =
	'Data table name for the approval card. Pass whenever known so users see a name instead of an ID.';

export const columnTypeSchema = z.enum(['string', 'number', 'boolean', 'date']);

export const columnSchema = z.object({
	name: z.string().describe('Column name (alphanumeric + underscores)'),
	type: columnTypeSchema.describe('Column data type'),
});

const filterConditionSchema = z.object({
	columnName: z.string(),
	condition: z.enum(['eq', 'neq', 'like', 'ilike', 'gt', 'gte', 'lt', 'lte']),
	value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
});

const filterTypeSchema = z.enum(['and', 'or']).describe('Combine filters with AND or OR');

export const filterSchema = z.object({
	type: filterTypeSchema,
	filters: z.array(filterConditionSchema),
});

export const filterSchemaWithMinOne = z.object({
	type: filterTypeSchema,
	filters: z.array(filterConditionSchema).min(1),
});

export const filterDescribe =
	'Row filter conditions. For text matching use `ilike` (case-insensitive contains); `like` is ' +
	'case-sensitive. Values without `%` are wrapped as `%value%`.';
