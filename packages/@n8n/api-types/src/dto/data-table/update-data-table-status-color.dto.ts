import { z } from 'zod';

import { boardStatusColorSchema } from '../../schemas/board-status.schema';
import { Z } from '../../zod-class';

const dataTableStatusNameSchema = z.string().trim().min(1).max(128);

export class UpdateDataTableStatusColorDto extends Z.class({
	status: dataTableStatusNameSchema,
	color: boardStatusColorSchema,
}) {}
