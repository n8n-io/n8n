import { z } from 'zod';

import { Z } from '../../zod-class';

const credentialBindingSchema = z.object({
	sourceCredentialId: z.string().min(1),
	targetCredentialId: z.string().min(1),
});

export class UpsertCredentialBindingsDto extends Z.class({
	bindings: z.array(credentialBindingSchema),
}) {}
