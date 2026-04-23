import { z } from 'zod';

// ---------------------------------------------------------------------------
// Blueprint item schemas — domain-level descriptions of what to build
// ---------------------------------------------------------------------------

export const blueprintWorkflowItemSchema = z.object({
	id: z.string().describe('Stable ID — preserved as task ID in the execution plan'),
	name: z.string().describe('Workflow display name'),
	purpose: z.string().describe('1-2 sentence description of what the workflow does and why'),
	integrations: z.array(z.string()).describe('Services/APIs this workflow connects'),
	triggerDescription: z
		.string()
		.optional()
		.describe('Trigger type in a few words (e.g. "Webhook POST", "Schedule hourly")'),
	existingWorkflowId: z
		.string()
		.optional()
		.describe('ID of existing workflow to modify (omit for new workflows)'),
	dependsOn: z
		.array(z.string())
		.default([])
		.describe('IDs of items that must complete before this one starts'),
});

export const blueprintDataTableItemSchema = z.object({
	id: z.string().describe('Stable ID — preserved as task ID'),
	name: z.string().describe('Table name or short task label'),
	purpose: z.string().describe('What to do: create with schema, delete, modify, or seed data'),
	columns: z
		.array(
			z.object({
				name: z.string(),
				type: z.enum(['string', 'number', 'boolean', 'date']),
			}),
		)
		.optional()
		.describe('Column definitions for table creation — omit for delete/modify operations'),
	dependsOn: z.array(z.string()).default([]),
});

export const blueprintResearchItemSchema = z.object({
	id: z.string().describe('Stable ID — preserved as task ID'),
	question: z.string().describe('Research question to answer'),
	constraints: z.string().optional().describe('Focus area or exclusions'),
	dependsOn: z.array(z.string()).default([]),
});

export const blueprintDelegateItemSchema = z.object({
	id: z.string().describe('Stable ID — preserved as task ID'),
	title: z.string().describe('Short task title'),
	description: z.string().describe('Detailed task description'),
	requiredTools: z.array(z.string()).describe('Tool names the delegate needs'),
	dependsOn: z.array(z.string()).default([]),
});

// ---------------------------------------------------------------------------
// Top-level blueprint schema
// ---------------------------------------------------------------------------

export const planningBlueprintSchema = z.object({
	summary: z.string().describe('1-2 sentence overview of the solution'),
	workflows: z.array(blueprintWorkflowItemSchema).default([]),
	dataTables: z.array(blueprintDataTableItemSchema).default([]),
	researchItems: z.array(blueprintResearchItemSchema).default([]),
	delegateItems: z.array(blueprintDelegateItemSchema).default([]),
	assumptions: z.array(z.string()).default([]).describe('Assumptions the plan relies on'),
	openQuestions: z
		.array(z.string())
		.default([])
		.describe('Unresolved questions that may need user input before execution'),
});

export type PlanningBlueprint = z.infer<typeof planningBlueprintSchema>;
export type BlueprintWorkflowItem = z.infer<typeof blueprintWorkflowItemSchema>;
export type BlueprintDataTableItem = z.infer<typeof blueprintDataTableItemSchema>;
export type BlueprintResearchItem = z.infer<typeof blueprintResearchItemSchema>;
export type BlueprintDelegateItem = z.infer<typeof blueprintDelegateItemSchema>;
