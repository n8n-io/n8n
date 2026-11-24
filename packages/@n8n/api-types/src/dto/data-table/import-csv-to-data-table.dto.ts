import { z } from 'zod';

import { Z } from '../../zod-class';

export class ImportCsvToDataTableDto extends Z.class({
	fileId: z.string().min(1),
}) {}
