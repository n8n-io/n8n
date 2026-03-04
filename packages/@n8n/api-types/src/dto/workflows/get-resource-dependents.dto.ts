import { z } from 'zod';
import { Z } from '../../zod-class';

export class GetResourceDependentsDto extends Z.class({
	resourceIds: z.array(z.string()).min(1).max(100),
	resourceType: z.enum(['credentialId', 'dataTableId']),
}) {}
