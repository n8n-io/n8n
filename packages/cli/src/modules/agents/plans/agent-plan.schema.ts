import { UserError } from 'n8n-workflow';
import { z } from 'zod';

export const AGENT_PLAN_FORMAT_VERSION = 2;

/** In this module, not in the tools module, so callers can read the names without loading the tools. */
export const AGENT_PLAN_TOOL_NAMES = {
	create: 'create_plan',
	read: 'read_plan',
	update: 'update_plan',
	close: 'close_plan',
} as const;

export class AgentPlanValidationError extends UserError {}

const idSchema = z.string().uuid().toLowerCase();
const itemFields = {
	id: idSchema,
	title: z.string().min(1),
	description: z.string(),
	status: z.enum(['pending', 'in_progress', 'paused', 'done', 'failed', 'cancelled']),
	dependsOn: z.array(idSchema),
	resultSummary: z.string().optional(),
	startedAt: z.string().datetime().nullable().default(null),
	endedAt: z.string().datetime().nullable().default(null),
};

export const agentPlanTaskSchema = z
	.object({
		...itemFields,
		kind: z.literal('task'),
		fallbackFor: idSchema.optional(),
		jobId: idSchema.optional(),
	})
	.strict();

export const agentPlanGroupSchema = z
	.object({ ...itemFields, kind: z.literal('group'), tasks: z.array(agentPlanTaskSchema) })
	.strict();

export const agentPlanDocumentSchema = z
	.object({
		title: z.string().min(1),
		description: z.string(),
		presentation: z
			.object({
				label: z.string().trim().min(1),
				detail: z.string().trim().min(1).optional(),
			})
			.strict()
			.optional(),
		items: z.array(z.discriminatedUnion('kind', [agentPlanTaskSchema, agentPlanGroupSchema])),
	})
	.strict();

export type AgentPlanDocument = z.infer<typeof agentPlanDocumentSchema>;
export type AgentPlanTask = z.infer<typeof agentPlanTaskSchema>;
export type AgentPlanGroup = z.infer<typeof agentPlanGroupSchema>;
export type AgentPlanItem = AgentPlanDocument['items'][number];
export type AgentPlanStatus = AgentPlanItem['status'];

const taskDefinition = agentPlanTaskSchema.omit({
	status: true,
	startedAt: true,
	endedAt: true,
	jobId: true,
});

const storedTaskSchema = z.union([
	taskDefinition.extend({ jobId: idSchema }).strict(),
	taskDefinition
		.extend({
			status: itemFields.status,
			startedAt: itemFields.startedAt,
			endedAt: itemFields.endedAt,
		})
		.strict(),
]);

const storedGroupSchema = agentPlanGroupSchema
	.omit({ status: true, startedAt: true, endedAt: true, tasks: true })
	.extend({ tasks: z.array(storedTaskSchema) });

export const storedAgentPlanSchema = agentPlanDocumentSchema.extend({
	items: z.array(z.union([storedTaskSchema, storedGroupSchema])),
});

export type StoredAgentPlanDocument = z.infer<typeof storedAgentPlanSchema>;

export function parseStoredAgentPlan(
	data: unknown,
	formatVersion: number,
): StoredAgentPlanDocument {
	if (formatVersion !== AGENT_PLAN_FORMAT_VERSION) {
		throw new AgentPlanValidationError(`Unsupported plan format version: ${formatVersion}`);
	}

	const result = storedAgentPlanSchema.safeParse(data);

	if (!result.success) throw new AgentPlanValidationError(result.error.message);

	return result.data;
}

/** Persist the status only when the parent owns it. */
export function storeAgentPlan(document: AgentPlanDocument): StoredAgentPlanDocument {
	const storeTask = ({ status, startedAt, endedAt, jobId, ...task }: AgentPlanTask) =>
		jobId ? { ...task, jobId } : { ...task, status, startedAt, endedAt };

	return storedAgentPlanSchema.parse({
		...document,
		items: document.items.map((item) => {
			if (item.kind === 'task') return storeTask(item);

			const { status, startedAt, endedAt, ...group } = item;

			return { ...group, tasks: group.tasks.map(storeTask) };
		}),
	});
}

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
