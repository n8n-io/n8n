import { z } from 'zod';

import { Z } from '../zod-class';

export class ExtractAgentFromWorkflowDto extends Z.class({
	workflowId: z.string().min(1),
	nodeName: z.string().min(1),
	name: z.string().min(1).max(128).optional(),
	description: z.string().max(512).optional(),
}) {}

export type ExtractAgentWarning = {
	code:
		| 'fallback_model_dropped'
		| 'output_parser_dropped'
		| 'memory_type_unsupported'
		| 'unknown_lm_provider'
		| 'lm_missing'
		| 'lm_credential_missing'
		| 'model_missing';
	message: string;
	nodeName?: string;
};
