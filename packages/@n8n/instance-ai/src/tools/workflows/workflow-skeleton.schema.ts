/**
 * Zod schemas for the workflow skeleton — the topology-only contract an agent
 * commits to before generating full SDK source. Nodes carry no parameters:
 * the skeleton pins node types, connections (with ports), and the expected
 * data flow on each edge, so structural mistakes surface before the expensive
 * codegen turn and later per-node parameter fills can run against a fixed
 * contract.
 */
import { z } from 'zod';

export const skeletonNodeSchema = z.object({
	name: z.string().min(1).describe('Unique node name; used as the connection key'),
	type: z.string().min(1).describe('Full node type id, e.g. "n8n-nodes-base.if"'),
	typeVersion: z.number().optional().describe('Omit to use the latest version'),
	purpose: z
		.string()
		.max(300)
		.describe('One line: what this node does in the workflow, in request terms'),
});

export const skeletonConnectionSchema = z.object({
	from: z.string().min(1).describe('Source node name'),
	to: z.string().min(1).describe('Destination node name'),
	type: z
		.string()
		.default('main')
		.describe(
			'Connection type: "main", or an AI port like "ai_languageModel", "ai_tool", "ai_memory" (sub-node → parent)',
		),
	fromIndex: z
		.number()
		.int()
		.min(0)
		.default(0)
		.describe('Source output index (IF: 0=true, 1=false; Switch: zero-based case index)'),
	toIndex: z
		.number()
		.int()
		.min(0)
		.default(0)
		.describe('Destination input index (e.g. Merge inputs)'),
});

export const skeletonEdgeContractSchema = z.object({
	from: z.string().min(1),
	to: z.string().min(1),
	fields: z
		.array(
			z.object({
				name: z.string().min(1),
				type: z.string().optional().describe('Optional hint, e.g. "string", "number", "object"'),
			}),
		)
		.min(1)
		.describe('Fields expected to flow on this edge'),
});

export const skeletonGroupSchema = z.object({
	name: z.string().min(1),
	nodes: z.array(z.string().min(1)).min(1).describe('Member node names'),
});

export const workflowSkeletonSchema = z.object({
	name: z.string().min(1).describe('Workflow name'),
	nodes: z.array(skeletonNodeSchema).min(1),
	connections: z.array(skeletonConnectionSchema),
	contracts: z
		.array(skeletonEdgeContractSchema)
		.optional()
		.describe('Data contracts for main-connection edges'),
	groups: z.array(skeletonGroupSchema).optional(),
});

export const skeletonDiagnosticSchema = z.object({
	severity: z.enum(['error', 'warning']),
	code: z.string(),
	message: z.string(),
	node: z.string().optional().describe('Node name the diagnostic anchors to, when node-scoped'),
});

export const validateSkeletonResultSchema = z.object({
	valid: z.boolean().describe('True when there are no error-severity diagnostics'),
	diagnostics: z.array(skeletonDiagnosticSchema),
	resolvedVersions: z
		.record(z.number())
		.describe('Node name → resolved typeVersion; pin these in the SDK source'),
});

export type WorkflowSkeleton = z.infer<typeof workflowSkeletonSchema>;
export type SkeletonNode = z.infer<typeof skeletonNodeSchema>;
export type SkeletonConnection = z.infer<typeof skeletonConnectionSchema>;
export type SkeletonDiagnostic = z.infer<typeof skeletonDiagnosticSchema>;
export type ValidateSkeletonResult = z.infer<typeof validateSkeletonResultSchema>;
