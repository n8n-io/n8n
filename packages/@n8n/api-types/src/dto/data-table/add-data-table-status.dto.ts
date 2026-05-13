import { z } from 'zod';

import { Z } from '../../zod-class';

const dataTableStatusNameSchema = z.string().trim().min(1).max(128);

export class AddDataTableStatusDto extends Z.class({
	status: dataTableStatusNameSchema,
}) {}
