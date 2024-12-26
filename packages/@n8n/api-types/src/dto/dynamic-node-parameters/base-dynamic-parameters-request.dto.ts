import type { INodeCredentials, INodeParameters, INodeTypeNameVersion } from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

export class BaseDynamicParametersRequestDto extends Z.class({
	path: z.string(),
	nodeTypeAndVersion: z.object({
		name: z.string(),
		version: z.number().int().min(1),
	}) satisfies z.ZodType<INodeTypeNameVersion>,
	currentNodeParameters: z.record(z.string(), z.any()) satisfies z.ZodType<INodeParameters>,
	methodName: z.string().optional(),
	credentials: z.record(z.string(), z.any()).optional() satisfies z.ZodType<
		INodeCredentials | undefined
	>,
}) {}
