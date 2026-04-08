import { z } from 'zod';

import { Z } from '../../zod-class';

const nodeSummarySchema = z.object({
	currentName: z.string(),
	nodeType: z.string(),
	displayName: z.string(),
	parameters: z.record(z.unknown()).optional(),
});

export class AiSuggestNodeNamesRequestDto extends Z.class({
	nodes: z.array(nodeSummarySchema).min(1).max(50),
	workflowName: z.string().optional(),
}) {}

export type AiNodeNameSuggestion = {
	currentName: string;
	suggestedName: string;
	reason: string;
};
