import { workflowUsageCoverageSchema } from '@n8n/api-types';
import { z } from 'zod';

const countSchema = z.number().int().nonnegative();

export const nodePreferenceGroupsSchema = z
	.array(
		z.object({
			id: z.string().min(1),
			purpose: z.string().min(1),
			nodeTypes: z.array(z.string().min(1)).min(2),
		}),
	)
	.min(1)
	.superRefine((groups, ctx) => {
		if (new Set(groups.map((group) => group.id)).size !== groups.length) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Group IDs must be unique.' });
		}
		for (const group of groups) {
			if (new Set(group.nodeTypes).size !== group.nodeTypes.length) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Node types must be unique in a group.',
				});
			}
		}
	});

export const nodeUsageResponseSchema = z.object({
	workflowsInScope: countSchema,
	nodeTypes: z
		.array(z.object({ nodeType: z.string().min(1), workflowCount: countSchema }))
		.optional(),
	workflows: z.array(z.object({ workflowId: z.string().min(1) })).optional(),
	truncated: z.boolean().optional(),
	coverage: workflowUsageCoverageSchema.optional(),
});

export const nodeUsageSnapshotSchema = z.object({
	version: z.literal(1),
	origin: z.enum(['mcp', 'service', 'seed-profile', 'snapshot']),
	projectId: z.string().min(1),
	groups: nodePreferenceGroupsSchema,
	histogram: nodeUsageResponseSchema.extend({
		nodeTypes: z.array(z.object({ nodeType: z.string().min(1), workflowCount: countSchema })),
	}),
	usageByNodeType: z.record(
		z.object({
			workflowsInScope: countSchema,
			workflowIds: z.array(z.string().min(1)),
			truncated: z.boolean(),
			coverage: workflowUsageCoverageSchema.optional(),
		}),
	),
});

export const preferenceThresholdsSchema = z.object({
	minimumWorkflows: z.number().int().min(1).default(3),
	minimumShare: z.number().min(0).max(1).default(0.7),
	minimumMargin: z.number().min(0).max(1).default(0.2),
});

type NodePreferenceGroup = z.infer<typeof nodePreferenceGroupsSchema>[number];
type NodeUsageResponse = z.infer<typeof nodeUsageResponseSchema>;
type NodeUsageSnapshot = z.infer<typeof nodeUsageSnapshotSchema>;
type PreferenceThresholds = z.infer<typeof preferenceThresholdsSchema>;

export type NodeUsageReader = (options: {
	projectId: string;
	nodeType?: string;
	limit: number;
}) => Promise<NodeUsageResponse>;

/** The reader can call getNodeTypeUsage directly or call the existing MCP tool. */
export async function captureNodeUsage(
	read: NodeUsageReader,
	projectId: string,
	groups: NodePreferenceGroup[],
	origin: 'mcp' | 'service' = 'service',
): Promise<NodeUsageSnapshot> {
	const validatedGroups = nodePreferenceGroupsSchema.parse(groups);
	const histogram = nodeUsageResponseSchema
		.extend({ nodeTypes: z.array(z.object({ nodeType: z.string(), workflowCount: countSchema })) })
		.parse(await read({ projectId, limit: 100 }));
	const usageByNodeType: NodeUsageSnapshot['usageByNodeType'] = {};
	const presentTypes = new Set(histogram.nodeTypes.map(({ nodeType }) => nodeType));
	const requestedTypes = new Set(validatedGroups.flatMap((group) => group.nodeTypes));

	if (!histogram.truncated && histogram.coverage?.complete !== false) {
		for (const nodeType of [...requestedTypes].sort()) {
			if (!presentTypes.has(nodeType)) continue;
			const usage = nodeUsageResponseSchema
				.extend({ workflows: z.array(z.object({ workflowId: z.string().min(1) })) })
				.parse(await read({ projectId, nodeType, limit: 100 }));
			usageByNodeType[nodeType] = {
				workflowsInScope: usage.workflowsInScope,
				workflowIds: [...new Set(usage.workflows.map(({ workflowId }) => workflowId))].sort(),
				truncated: usage.truncated ?? false,
				coverage: usage.coverage,
			};
		}
	}

	return nodeUsageSnapshotSchema.parse({
		version: 1,
		origin,
		projectId,
		groups: validatedGroups,
		histogram,
		usageByNodeType,
	});
}

type AbstentionReason =
	| 'truncated-histogram'
	| 'incomplete-evidence'
	| 'inconsistent-evidence'
	| 'no-usage'
	| 'insufficient-support'
	| 'no-clear-preference';

interface NodePreferenceSuggestion {
	groupId: string;
	category: 'node';
	value: string;
	purpose: string;
	content: string;
	evidence: {
		workflowIds: string[];
		workflowCount: number;
		eligibleWorkflowCount: number;
		share: number;
		margin: number;
		alternatives: Array<{ nodeType: string; workflowCount: number }>;
	};
}

/** Usage supports a candidate preference. It does not establish the user's intent. */
export function mineNodePreferences(snapshotInput: unknown, thresholdsInput: unknown = {}) {
	const snapshot = nodeUsageSnapshotSchema.parse(snapshotInput);
	const thresholds = preferenceThresholdsSchema.parse(thresholdsInput);
	const suggestions: NodePreferenceSuggestion[] = [];
	const abstentions: Array<{ groupId: string; reason: AbstentionReason }> = [];

	for (const group of [...snapshot.groups].sort((a, b) => a.id.localeCompare(b.id))) {
		const result = evaluateGroup(snapshot, group, thresholds);
		if (typeof result === 'string') {
			abstentions.push({ groupId: group.id, reason: result });
		} else {
			suggestions.push(result);
		}
	}

	return {
		approach: 'deterministic-node-usage',
		origin: snapshot.origin,
		scope: { projectId: snapshot.projectId },
		thresholds,
		metrics: { modelCalls: 0, inputTokens: 0, outputTokens: 0 },
		suggestions,
		abstentions,
	};
}

function evaluateGroup(
	snapshot: NodeUsageSnapshot,
	group: NodePreferenceGroup,
	thresholds: PreferenceThresholds,
): NodePreferenceSuggestion | AbstentionReason {
	if (snapshot.histogram.coverage?.complete === false) return 'incomplete-evidence';
	if (snapshot.histogram.truncated) return 'truncated-histogram';
	const counts = new Map(
		snapshot.histogram.nodeTypes.map(({ nodeType, workflowCount }) => [nodeType, workflowCount]),
	);
	if (counts.size !== snapshot.histogram.nodeTypes.length) return 'inconsistent-evidence';
	const eligibleIds = new Set<string>();
	const alternatives: Array<{ nodeType: string; workflowIds: string[]; workflowCount: number }> =
		[];

	for (const nodeType of group.nodeTypes) {
		const count = counts.get(nodeType) ?? 0;
		const usage = snapshot.usageByNodeType[nodeType];
		if (count > 0 && (!usage || usage.truncated || usage.coverage?.complete === false))
			return 'incomplete-evidence';
		const workflowIds = [...new Set(usage?.workflowIds ?? [])].sort();
		if (
			workflowIds.length !== count ||
			count > snapshot.histogram.workflowsInScope ||
			(usage && usage.workflowsInScope !== snapshot.histogram.workflowsInScope)
		) {
			return 'inconsistent-evidence';
		}
		for (const id of workflowIds) eligibleIds.add(id);
		alternatives.push({ nodeType, workflowIds, workflowCount: count });
	}

	if (eligibleIds.size === 0) return 'no-usage';
	if (eligibleIds.size > snapshot.histogram.workflowsInScope) return 'inconsistent-evidence';
	alternatives.sort(
		(a, b) => b.workflowCount - a.workflowCount || a.nodeType.localeCompare(b.nodeType),
	);
	const [winner, runnerUp] = alternatives;
	if (winner.workflowCount < thresholds.minimumWorkflows) return 'insufficient-support';
	const share = winner.workflowCount / eligibleIds.size;
	const margin = (winner.workflowCount - runnerUp.workflowCount) / eligibleIds.size;
	if (
		winner.workflowCount === runnerUp.workflowCount ||
		share < thresholds.minimumShare ||
		margin < thresholds.minimumMargin
	) {
		return 'no-clear-preference';
	}

	return {
		groupId: group.id,
		category: 'node',
		value: winner.nodeType,
		purpose: group.purpose,
		content: `Prefer ${winner.nodeType} for ${group.purpose} in this project.`,
		evidence: {
			workflowIds: winner.workflowIds,
			workflowCount: winner.workflowCount,
			eligibleWorkflowCount: eligibleIds.size,
			share,
			margin,
			alternatives: alternatives.map(({ nodeType, workflowCount }) => ({
				nodeType,
				workflowCount,
			})),
		},
	};
}
