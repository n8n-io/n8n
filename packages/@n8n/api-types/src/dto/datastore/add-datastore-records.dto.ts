import { z } from 'zod';
import { Z } from 'zod-class';

export class AddDatastoreRecordsDto extends Z.class({
	records: z.array(z.record(z.string(), z.any())),
}) {}
