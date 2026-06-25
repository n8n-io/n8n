import { z } from 'zod';

import { Z } from '../../zod-class';

const credentialBindingSchema = z.object({
	nodeId: z.string().min(1),
	credentialType: z.string().min(1),
	targetCredentialId: z.string().min(1),
});

export class UpsertCredentialBindingsDto extends Z.class({
	bindings: z.array(credentialBindingSchema),
}) {}
