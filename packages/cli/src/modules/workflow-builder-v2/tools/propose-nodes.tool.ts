import { Tool } from '@n8n/agents';
import type { BuiltTool } from '@n8n/agents';
import {
	NodeConnectionTypes,
	NodeHelpers,
	type INode,
	type INodeTypeDescription,
	type NodeConnectionType,
} from 'n8n-workflow';
import { z } from 'zod';

import type { RunStateRegistry } from '../session/run-state-registry';
import type {
	ConnectionContext,
	Ghost,
	InsertionPoint,
	PendingCommit,
} from '../session/session.types';
import type { LookupNodeDescription } from '../utils/node-filter';
import { checkStandalone } from '../utils/node-filter';
import { summarizeWorkflow } from '../utils/workflow-summary';

type ProposableGhost = Ghost & { parameters: INode['parameters'] };

function isNodeParameters(value: unknown): value is INode['parameters'] {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const candidateSchema = z.object({
	nodeType: z.string().min(1).describe('Canonical node id, e.g. n8n-nodes-base.scheduleTrigger'),
	version: z.number().min(1),
	displayName: z
		.string()
		.trim()
		.min(1)
		.describe(
			'Unique canvas node name describing this node purpose, e.g. "Gmail - Send summary email", not just "Gmail" when another Gmail node exists.',
		),
	parameters: z
		.custom<INode['parameters']>(isNodeParameters)
		.describe(
			'Node parameters to show in the ghost and commit unchanged after the user picks it. Include resource/operation/mode/authentication when the node uses them.',
		),
	reason: z.string().min(1).describe('Short why-this-node sentence shown to the user'),
});

const insertionPointSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('fromStart') }),
	z.object({ kind: z.literal('after'), afterNodeId: z.string().min(1) }),
]);

const nodeConnectionTypeSchema = z.custom<NodeConnectionType>(
	(value) => typeof value === 'string' && value.length > 0,
);

const connectionContextSchema = z.object({
	nodeId: z.string().min(1).describe('Id of the node whose handle should be connected'),
	mode: z.enum(['inputs', 'outputs']).describe('Handle side on `nodeId`'),
	type: nodeConnectionTypeSchema.describe('n8n connection type, e.g. main or ai_languageModel'),
	index: z.number().int().min(0).describe('Input/output index on `nodeId`'),
	targetNodeId: z.string().min(1).optional(),
	targetType: nodeConnectionTypeSchema.optional(),
	targetIndex: z.number().int().min(0).optional(),
});

const inputSchema = z.object({
	insertionPoint: insertionPointSchema,
	connectionContext: connectionContextSchema
		.optional()
		.describe(
			'Use in full-workflow mode for support nodes that must connect to a specific non-main handle, such as an AI language model sub-node into an AI Agent input.',
		),
	candidates: z.array(candidateSchema).min(1).max(5),
});

const suspendSchema = z.object({
	candidates: z.array(candidateSchema),
	insertionPoint: insertionPointSchema,
});

const resumeSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('pick'), chosenIndex: z.number().int().min(0) }),
	z.object({ kind: z.literal('reject') }),
]);

export type ProposeResumePayload = z.infer<typeof resumeSchema>;

export type ResolveNodeVersion = (nodeType: string) => number | null;

/** Minimal logger surface the tool uses — `console` satisfies it. */
type ToolLogger = {
	debug: (message: string, meta?: Record<string, unknown>) => void;
	warn: (message: string, meta?: Record<string, unknown>) => void;
};

export function createProposeNodesTool(
	registry: RunStateRegistry,
	sessionId: string,
	lookupNodeDescription: LookupNodeDescription,
	resolveNodeVersion: ResolveNodeVersion,
	logger: ToolLogger = console,
): BuiltTool {
	return new Tool('propose_nodes')
		.description(
			'Propose one or more candidate nodes (ghosts) to the user at a specific insertion point. Always call this before committing — even when only one candidate is viable. Suspends until the user picks one (resumePayload: { kind: "pick", chosenIndex }) or rejects (resumePayload: { kind: "reject" }).',
		)
		.input(inputSchema)
		.suspend(suspendSchema)
		.resume(resumeSchema)
		.handler(async (input, ctx) => {
			const incomingCandidates: Ghost[] = input.candidates;

			if (!ctx.resumeData) {
				const state = registry.require(sessionId);
				const insertionPoint: InsertionPoint =
					state.requestedInsertionPoint ?? input.insertionPoint;
				const connectionContext = state.connectionContext ?? input.connectionContext ?? null;
				const unknownFiltered: Array<{ nodeType: string; reason: string }> = [];
				const incompatibleFiltered: Array<{ nodeType: string; reason: string }> = [];
				const versionChanges: Array<{
					nodeType: string;
					from: number;
					to: number;
				}> = [];
				const candidatesWithDescriptions: Array<{
					ghost: ProposableGhost;
					description: INodeTypeDescription;
				}> = [];
				for (const candidate of incomingCandidates) {
					const resolvedVersion = resolveNodeVersion(candidate.nodeType);
					if (resolvedVersion === null) {
						unknownFiltered.push({
							nodeType: candidate.nodeType,
							reason:
								'Node type is not installed or not recognized by this n8n instance. ' +
								'Call `verify_node` or choose a canonical node id from the node catalog.',
						});
						continue;
					}

					const description = lookupNodeDescription(candidate.nodeType, resolvedVersion);
					if (!description) {
						unknownFiltered.push({
							nodeType: candidate.nodeType,
							reason:
								'Node type exists but this version is not recognized by this n8n instance. ' +
								'Call `verify_node` and use the current installed version.',
						});
						continue;
					}

					if (resolvedVersion !== candidate.version) {
						versionChanges.push({
							nodeType: candidate.nodeType,
							from: candidate.version,
							to: resolvedVersion,
						});
					}
					candidatesWithDescriptions.push({
						ghost: {
							...candidate,
							version: resolvedVersion,
							parameters: candidate.parameters ?? {},
						},
						description,
					});
				}

				if (candidatesWithDescriptions.length === 0) {
					logger.debug('[builder-v2] propose_nodes — all candidates are unknown', {
						sessionId,
						unknownCount: unknownFiltered.length,
					});
					return {
						error: 'unknown-node-type',
						rejected: unknownFiltered,
						hint:
							'None of the proposed node types are installed/recognized. Use canonical ids ' +
							'from the n8n node catalog. If you are unsure, call `verify_node` before ' +
							'calling `propose_nodes`.',
					} as never;
				}

				// 1c: Filter sub-nodes out of the candidate list. Reject the whole
				// call only when EVERY candidate is a sub-node — otherwise suspend
				// with the valid candidates and report the rejected ones so the
				// LLM can learn from the filter on the next call.
				const subNodeFiltered: Array<{ nodeType: string; reason: string }> = [];
				const standaloneCandidates: ProposableGhost[] = [];
				for (const { ghost, description } of candidatesWithDescriptions) {
					const compatibility = checkConnectionCompatibility(ghost, description, connectionContext);
					if (!compatibility.allowed) {
						incompatibleFiltered.push({
							nodeType: ghost.nodeType,
							reason: compatibility.reason,
						});
						continue;
					}

					const check = checkStandalone(ghost.nodeType, ghost.version, () => description);
					if (connectionContext && connectionContext.type !== NodeConnectionTypes.Main) {
						standaloneCandidates.push(ghost);
					} else if (check.allowed) {
						standaloneCandidates.push(ghost);
					} else {
						subNodeFiltered.push({ nodeType: ghost.nodeType, reason: check.reason });
					}
				}

				if (standaloneCandidates.length === 0) {
					logger.debug('[builder-v2] propose_nodes — all candidates are sub-nodes', {
						sessionId,
						subNodeCount: subNodeFiltered.length,
						incompatibleCount: incompatibleFiltered.length,
					});
					return {
						error:
							incompatibleFiltered.length > 0 ? 'incompatible-connection-type' : 'all-sub-nodes',
						rejected: [...incompatibleFiltered, ...subNodeFiltered],
						hint: connectionContext
							? `Every candidate was rejected for connection type "${connectionContext.type}". Propose a node whose ${connectionContext.mode === 'inputs' ? 'output' : 'input'} supports that type.`
							: 'Every candidate was rejected as a sub-node. Sub-nodes (language models, embeddings, memory, AI tools, document loaders, text splitters, output parsers, vector stores) cannot stand alone. Propose top-level workflow nodes instead — e.g. `@n8n/n8n-nodes-langchain.agent` or `@n8n/n8n-nodes-langchain.chainLlm` for AI flows.',
					} as never;
				}

				// Node types can repeat for different operations (e.g. one Gmail
				// node reads, another Gmail node sends). Node names cannot repeat:
				// n8n connections are keyed by node name, and duplicate names make
				// the canvas/doc-store ambiguous. Force the agent to provide a
				// purpose-specific displayName before ghosts reach the UI.
				const committedNames = new Set(state.workflow.nodes.map((n) => n.name));
				const seenCandidateNames = new Set<string>();
				const duplicateNameFiltered: Array<{
					nodeType: string;
					displayName: string;
					reason: string;
				}> = [];
				const validCandidates: ProposableGhost[] = [];
				for (const candidate of standaloneCandidates) {
					if (committedNames.has(candidate.displayName)) {
						duplicateNameFiltered.push({
							nodeType: candidate.nodeType,
							displayName: candidate.displayName,
							reason:
								'This displayName is already used in the workflow. Re-propose with a unique, purpose-specific displayName.',
						});
						continue;
					}
					if (seenCandidateNames.has(candidate.displayName)) {
						duplicateNameFiltered.push({
							nodeType: candidate.nodeType,
							displayName: candidate.displayName,
							reason:
								'Another candidate in this proposal already uses this displayName. Candidate display names must be unique.',
						});
						continue;
					}

					seenCandidateNames.add(candidate.displayName);
					validCandidates.push(candidate);
				}

				if (validCandidates.length === 0) {
					logger.debug('[builder-v2] propose_nodes — all candidates have duplicate names', {
						sessionId,
						duplicateNameCount: duplicateNameFiltered.length,
					});
					return {
						error: 'duplicate-display-name',
						rejected: duplicateNameFiltered,
						workflowSummary: summarizeWorkflow(state.workflow),
						hint: 'Every candidate used a displayName that is already on the canvas, or duplicated another candidate. Re-propose with a unique, purpose-specific displayName. The same nodeType is allowed for a different operation; keep the nodeType and change displayName, e.g. "Gmail - Send summary email".',
					} as never;
				}

				logger.debug('[builder-v2] propose_nodes — suspending', {
					sessionId,
					candidates: validCandidates.length,
					unknownFiltered: unknownFiltered.length,
					incompatibleFiltered: incompatibleFiltered.length,
					subNodeFiltered: subNodeFiltered.length,
					duplicateNameFiltered: duplicateNameFiltered.length,
					versionChanges,
				});

				registry.update(sessionId, {
					pendingGhosts: validCandidates,
					pendingInsertionPoint: insertionPoint,
					pendingConnectionContext: connectionContext,
				});
				return await ctx.suspend({ candidates: validCandidates, insertionPoint });
			}

			// Resumed
			logger.debug('[builder-v2] propose_nodes — resume', {
				sessionId,
				kind: ctx.resumeData.kind,
				chosenIndex: ctx.resumeData.kind === 'pick' ? ctx.resumeData.chosenIndex : undefined,
			});

			const stateBeforeClear = registry.require(sessionId);
			const insertionPoint: InsertionPoint =
				stateBeforeClear.requestedInsertionPoint ?? input.insertionPoint;
			const connectionContext =
				stateBeforeClear.pendingConnectionContext ??
				stateBeforeClear.connectionContext ??
				input.connectionContext ??
				null;
			registry.update(sessionId, {
				pendingGhosts: null,
				pendingInsertionPoint: null,
				pendingConnectionContext: null,
				pendingResume: null,
			});

			const workflowSummary = summarizeWorkflow(stateBeforeClear.workflow);

			if (ctx.resumeData.kind === 'reject') {
				// Clear any prior pendingCommit on reject.
				registry.update(sessionId, { pendingCommit: null, autoCommittedPick: null });
				return { rejected: true, workflowSummary } as never;
			}

			// The candidate list shown to the user is the one we suspended with,
			// which lives on the run state as pendingGhosts. The tool input arg
			// `candidates` is the LLM's ORIGINAL list which may include sub-nodes /
			// duplicates we filtered out. Pick from the filtered list so the index
			// always matches what the FE saw.
			const candidatesShownToUser = stateBeforeClear.pendingGhosts ?? incomingCandidates;
			const chosen = candidatesShownToUser[ctx.resumeData.chosenIndex];
			if (!chosen) {
				registry.update(sessionId, { pendingCommit: null, autoCommittedPick: null });
				return { rejected: true, error: 'chosenIndex out of range', workflowSummary } as never;
			}

			if (stateBeforeClear.autoCommittedPick) {
				registry.update(sessionId, { pendingCommit: null, autoCommittedPick: null });
				return {
					chosen,
					committed: stateBeforeClear.autoCommittedPick,
					workflowSummary,
					hint: 'The picked node has already been committed by the system. Do not call `commit_node` for this pick; continue with the next task or proposal.',
				} as never;
			}

			// 1a: Authorize the next commit_node call. The state still carries
			// `pickedPosition` (set by the service on the confirm controller),
			// which we capture here so a single source of truth (`pendingCommit`)
			// guards the commit.
			const pendingCommit: PendingCommit = {
				nodeType: chosen.nodeType,
				version: chosen.version,
				displayName: chosen.displayName,
				...(chosen.parameters ? { parameters: chosen.parameters } : {}),
				insertionPoint,
				connectionContext,
				...(stateBeforeClear.pickedPosition ? { position: stateBeforeClear.pickedPosition } : {}),
			};
			registry.update(sessionId, { pendingCommit });

			return { chosen, insertionPoint, workflowSummary } as never;
		})
		.build();
}

function checkConnectionCompatibility(
	ghost: Ghost,
	description: INodeTypeDescription,
	connectionContext: ConnectionContext | null,
): { allowed: true } | { allowed: false; reason: string } {
	if (!connectionContext) return { allowed: true };

	const sideToInspect =
		connectionContext.mode === 'inputs' ? description.outputs : description.inputs;
	const supportedTypes = getStaticConnectionTypes(sideToInspect);
	if (supportedTypes === null) {
		return { allowed: true };
	}

	if (supportedTypes.includes(connectionContext.type)) {
		return { allowed: true };
	}

	return {
		allowed: false,
		reason:
			`Candidate "${ghost.nodeType}" cannot connect to "${connectionContext.type}". ` +
			`It supports ${connectionContext.mode === 'inputs' ? 'outputs' : 'inputs'}: ` +
			`${supportedTypes.join(', ') || 'none'}.`,
	};
}

function getStaticConnectionTypes(
	connections: INodeTypeDescription['inputs'] | INodeTypeDescription['outputs'],
): NodeConnectionType[] | null {
	if (typeof connections === 'string') return null;
	return NodeHelpers.getConnectionTypes(connections);
}
