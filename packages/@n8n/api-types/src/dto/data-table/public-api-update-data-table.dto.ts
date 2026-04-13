import { z } from 'zod';

import { dataTableNameSchema } from '../../schemas/data-table.schema';
import { Z } from '../../zod-class';

export class PublicApiUpdateDataTableDto extends Z.class({
	name: dataTableNameSchema,
}) {}
