import { UserError } from 'n8n-workflow';
import { z } from 'zod';

export const AGENT_PLAN_FORMAT_VERSION = 1;

export class AgentPlanValidationError extends UserError {}

const idSchema = z.string().uuid().toLowerCase();
const itemFields = {
	id: idSchema,
	title: z.string().min(1),
	description: z.string(),
	status: z.enum(['pending', 'in_progress', 'done', 'failed', 'cancelled']),
	dependsOn: z.array(idSchema),
	resultSummary: z.string().optional(),
	startedAt: z.string().datetime().nullable().default(null),
	endedAt: z.string().datetime().nullable().default(null),
};

export const agentPlanTaskSchema = z
	.object({ ...itemFields, kind: z.literal('task'), fallbackFor: idSchema.optional() })
	.strict();

export const agentPlanGroupSchema = z
	.object({ ...itemFields, kind: z.literal('group'), tasks: z.array(agentPlanTaskSchema) })
	.strict();

export const agentPlanDocumentSchema = z
	.object({
		title: z.string().min(1),
		description: z.string(),
		items: z.array(z.discriminatedUnion('kind', [agentPlanTaskSchema, agentPlanGroupSchema])),
	})
	.strict();

export type AgentPlanDocument = z.infer<typeof agentPlanDocumentSchema>;
export type AgentPlanTask = z.infer<typeof agentPlanTaskSchema>;
export type AgentPlanGroup = z.infer<typeof agentPlanGroupSchema>;
export type AgentPlanItem = AgentPlanDocument['items'][number];
export type AgentPlanStatus = AgentPlanItem['status'];

export function parseAgentPlan(data: unknown, formatVersion: number): AgentPlanDocument {
	if (formatVersion !== AGENT_PLAN_FORMAT_VERSION) {
		throw new AgentPlanValidationError(`Unsupported plan format version: ${formatVersion}`);
	}
	const result = agentPlanDocumentSchema.safeParse(data);
	if (!result.success) {
		throw new AgentPlanValidationError(
			result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n'),
		);
	}
	return result.data;
}
