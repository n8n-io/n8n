import { z } from 'zod';
import { Z } from 'zod-class';

/**
 * Transfer connection to different project.
 */
export class TransferSecretProviderConnectionDto extends Z.class({
	destinationProjectId: z.string().min(1),
}) {}
