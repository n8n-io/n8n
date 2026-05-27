import { z } from 'zod';

const ConversationTurnSchema = z.object({
	role: z.enum(['user', 'assistant']),
	text: z.string(),
});

const ExecutionScenarioSchema = z.object({
	name: z.string().min(1),
	description: z.string(),
	dataSetup: z.string(),
	successCriteria: z.string(),
	requires: z.string().optional(),
});

export const WorkflowTestCaseSchema = z.object({
	conversation: z.array(ConversationTurnSchema).min(1),
	complexity: z.enum(['simple', 'medium', 'complex']),
	tags: z.array(z.string()),
	triggerType: z.enum(['manual', 'webhook', 'schedule', 'form']).optional(),
	executionScenarios: z.array(ExecutionScenarioSchema).min(1),
	messageBudget: z.number().int().positive().optional(),
});

export type WorkflowTestCaseInput = z.infer<typeof WorkflowTestCaseSchema>;
