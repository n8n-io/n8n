import { z } from 'zod';

import { dataTableIdSchema } from '../../schemas/data-table.schema';
import { Z } from '../../zod-class';

const pageSizeSchema = z.coerce.number().int().min(1).max(100).default(25);

export class GetDataTableKanbanBoardQueryDto extends Z.class({
	groupByColumnId: dataTableIdSchema,
	rowsPerLane: pageSizeSchema,
	search: z.string().optional(),
}) {}

export class GetDataTableKanbanLaneQueryDto extends Z.class({
	groupByColumnId: dataTableIdSchema,
	laneValue: z.string().trim().min(1).max(128).optional(),
	limit: pageSizeSchema,
	cursor: z.string().min(1).max(512).optional(),
	search: z.string().optional(),
}) {}

export class MoveDataTableKanbanRowDto extends Z.class({
	groupByColumnId: dataTableIdSchema,
	targetValue: z.string().trim().min(1).max(128).nullable(),
	afterRowId: z.number().int().positive().nullable(),
}) {}
