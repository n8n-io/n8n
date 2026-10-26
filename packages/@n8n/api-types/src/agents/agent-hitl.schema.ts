import { z } from 'zod';

export const AGENT_DECISION_TRIGGER_NODE_TYPE = 'n8n-nodes-base.agentDecisionTrigger';

export const AgentApprovalRouteSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('conversation') }).strict(),
	z.object({ type: z.literal('configuration'), configurationId: z.string().min(1) }).strict(),
]);

export const AgentHitlConfigurationSchema = z
	.object({
		id: z.string().min(1),
		name: z.string().trim().min(1),
		method: z.literal('workflow'),
		workflowId: z.string().min(1),
	})
	.strict();

export const AgentDecisionSchema = z.object({
	approved: z.boolean(),
	reason: z.string().optional(),
});

export type AgentApprovalRoute = z.infer<typeof AgentApprovalRouteSchema>;
export type AgentHitlConfiguration = z.infer<typeof AgentHitlConfigurationSchema>;

export interface AgentPendingApproval {
	id: string;
	title: string;
	status: string;
	requestedAt: string;
	threadId: string;
	workflowExecutionId: string | null;
}

/** Send-and-wait nodes return either the decision or a data envelope. */
export function parseAgentDecision(value: unknown): z.infer<typeof AgentDecisionSchema> {
	const direct = AgentDecisionSchema.safeParse(value);
	if (direct.success) return direct.data;
	return z.object({ data: AgentDecisionSchema }).parse(value).data;
}
