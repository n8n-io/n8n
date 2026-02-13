import { z } from 'zod';
import { Z } from 'zod-class';

export class TransferCredentialBodyDto extends Z.class({
	destinationProjectId: z.string(),
}) {}
