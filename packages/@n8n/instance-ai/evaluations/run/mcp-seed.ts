// ---------------------------------------------------------------------------
// Seeding for `--build-via-mcp` builds. The orchestrator path restores a case
// seed into the agent's own thread. `claude` has no n8n thread, so the seed's
// artifacts go into the build user's project through an owner thread bound to
// it, and the earlier conversation reaches `claude` as text.
// ---------------------------------------------------------------------------

import type { InstanceAiEvalSeedDataTable } from '@n8n/api-types';
import { randomUUID } from 'node:crypto';

import type { N8nClient } from '../clients/n8n-client';
import {
	activeSeedAgentId,
	remapSeedArtifactIds,
	transcriptPrefixFromSeed,
	type ConversationSeed,
} from '../harness/conversation-seed';
import { reconstructSeedFromThread } from '../harness/langsmith-seed';
import type { EvalLogger } from '../harness/logger';
import { executePriorRuns } from '../harness/prior-runs';
import { restoreRecordedRuns, seedNodeNamesById } from '../harness/recorded-runs';
import type { CaseSeed } from '../harness/schema';
import {
	buildSeededTablesNote,
	dedupeScenarioSeedTables,
	uniquifySeedTableNames,
} from '../harness/seed-tables';
import type { ArtifactRef, ConversationTurn, ExecutionScenario, TranscriptTurn } from '../types';
import { agentTextOf, attachedAgentNote, attachedWorkflowNote } from '../utils/conversation-text';

export interface McpBuildSeed {
	/** Owner thread bound to the build user's project. Scenario rows are reseeded through it. */
	threadId: string;
	/** The conversation to drive. A replay seed puts its live turn first. */
	conversation: ConversationTurn[];
	/** Sent before the opening message and kept out of the transcript: the earlier
	 *  conversation and the attachment's id. */
	openingPrefix: string;
	/** Sent and recorded with the opening message, so the judge sees what was attached. */
	openingNote: string;
	/** Sent after the opening message: the scenario tables that already exist. */
	openingSuffix: string;
	/** The seeded history, ahead of the live turns in the graded transcript. */
	transcriptPrefix: TranscriptTurn[];
	/** Restored workflow ids, the attached one first. */
	workflowIds: string[];
	/** Restored Agents, the attached or last-targeted one first. */
	agentRefs: ArtifactRef[];
	scenarioTableIdsByName: Record<string, string>;
	/** Team projects the seed created. Everything else lives in the build user's
	 *  project and is deleted with the user. */
	projectIds: string[];
	priorRunFailed?: string;
}

/**
 * Prepare what a seeded or table-backed MCP build needs before `claude` starts.
 * Returns undefined when the case has neither. Throws on any setup failure: the
 * caller reports it as a seeding failure, not as a builder one.
 */
export async function prepareMcpBuildSeed(opts: {
	ownerClient: N8nClient;
	/** The build user, already logged in. */
	memberClient: N8nClient;
	memberUserId: string;
	conversation: ConversationTurn[];
	seed?: CaseSeed;
	executionScenarios?: ExecutionScenario[];
	logger: EvalLogger;
}): Promise<McpBuildSeed | undefined> {
	const { ownerClient, logger } = opts;
	const { seed, conversation } = await resolveSeed(opts.seed, opts.conversation);
	const scenarioTables = dedupeScenarioSeedTables(opts.executionScenarios ?? [], logger);
	if (!seed && scenarioTables.length === 0) return undefined;

	const projectId = await opts.memberClient.getPersonalProjectId();
	const threadId = randomUUID();
	await ownerClient.ensureThread(threadId, projectId);

	const remapped = seed ? remapSeedArtifactIds(seed) : undefined;
	const restored = remapped
		? await restoreArtifacts(ownerClient, threadId, seed!, remapped)
		: undefined;

	// Recorded runs replay exact history, before the prior runs, as on the Instance
	// AI arm. A failed restore throws: the case would otherwise lose its premise.
	if (opts.seed?.mode === 'inline' && opts.seed.recordedRuns?.length && restored) {
		await restoreRecordedRuns({
			client: ownerClient,
			threadId,
			recordedRuns: opts.seed.recordedRuns,
			seedWorkflows: restored.workflowsBySeedId,
			seedNodeNames: seedNodeNamesById(opts.seed.workflows),
			logger,
		});
	}

	let priorRunFailed: string | undefined;
	if (opts.seed?.mode === 'inline' && opts.seed.priorRuns?.length && restored) {
		const outcomes = await executePriorRuns({
			client: ownerClient,
			priorRuns: opts.seed.priorRuns,
			seedWorkflows: restored.workflowsBySeedId,
			logger,
		});
		const missing = outcomes.filter((outcome) => !outcome.ran);
		if (missing.length > 0) {
			priorRunFailed = missing
				.map((outcome) => `${outcome.workflow}: ${outcome.errors.join('; ') || 'unknown'}`)
				.join(' | ');
		}
	}

	const tables = await createScenarioTables(
		ownerClient,
		threadId,
		scenarioTables,
		restored?.tablesByName,
	);

	const attachment = resolveAttachment(conversation[0], restored);

	// Created last, so an earlier failure leaves no instance-level project behind.
	const projectIds = await createSeedProjects(
		ownerClient,
		remapped?.projects ?? [],
		opts.memberUserId,
	);

	const transcriptPrefix = remapped ? transcriptPrefixFromSeed(remapped.messages) : [];
	const workflowIds = restored?.workflowIds ?? [];
	const agentIds = restored?.agentIds ?? [];
	const activeAgentId = attachment.agentId ?? (remapped && activeSeedAgentId(remapped));

	return {
		threadId,
		conversation,
		openingPrefix: [earlierConversationText(transcriptPrefix), attachment.idLine]
			.filter(Boolean)
			.join('\n\n'),
		openingNote: attachment.note,
		openingSuffix: tables.note,
		transcriptPrefix,
		workflowIds: firstOf(workflowIds, attachment.workflowId),
		agentRefs: firstOf(agentIds, activeAgentId).map((id) => ({ type: 'agent', id, projectId })),
		scenarioTableIdsByName: tables.idsByName,
		projectIds,
		...(priorRunFailed ? { priorRunFailed } : {}),
	};
}

/** Team projects outlive the build user, so a failure part way deletes the ones made. */
async function createSeedProjects(
	ownerClient: N8nClient,
	projects: ConversationSeed['projects'],
	memberUserId: string,
): Promise<string[]> {
	const projectIds: string[] = [];
	try {
		for (const project of projects) {
			const created = await ownerClient.createTeamProject(project.name);
			projectIds.push(created.id);
			await ownerClient.addProjectViewer(created.id, memberUserId);
		}
	} catch (error) {
		await Promise.allSettled(projectIds.map(async (id) => await ownerClient.deleteProject(id)));
		throw error;
	}
	return projectIds;
}

async function resolveSeed(
	seed: CaseSeed | undefined,
	conversation: ConversationTurn[],
): Promise<{ seed?: ConversationSeed; conversation: ConversationTurn[] }> {
	switch (seed?.mode) {
		case 'replay': {
			const reconstructed = await reconstructSeedFromThread(seed);
			return {
				seed: reconstructed.seed,
				conversation: [{ role: 'user', text: reconstructed.liveTurn }, ...conversation],
			};
		}
		case 'inline':
			return { seed, conversation };
		case undefined:
			return { conversation };
		default: {
			const unhandled: never = seed;
			throw new Error(`Unhandled seed mode: ${JSON.stringify(unhandled)}`);
		}
	}
}

interface RestoredArtifacts {
	workflowIds: string[];
	agentIds: string[];
	/** Authored seed id → the workflow as restored. */
	workflowsBySeedId: Map<string, { id: string; name: string }>;
	agentsBySeedId: Map<string, { id: string; name: string }>;
	/** Seed table name → the table as restored. */
	tablesByName: Map<string, { id: string; name: string }>;
}

async function restoreArtifacts(
	ownerClient: N8nClient,
	threadId: string,
	seed: ConversationSeed,
	remapped: ConversationSeed,
): Promise<RestoredArtifacts> {
	const seedTables = uniquifySeedTableNames(remapped.dataTables);
	const hasArtifacts =
		remapped.workflows.length > 0 ||
		remapped.dataTables.length > 0 ||
		remapped.agents.length > 0 ||
		remapped.folders.length > 0;
	const result = hasArtifacts
		? await ownerClient.restoreThread(
				threadId,
				[],
				remapped.workflows,
				seedTables,
				remapped.agents,
				{ folders: remapped.folders, uniquifyNames: false },
			)
		: { workflowIds: [], dataTableIds: [], agentIds: [] };

	// MCP tools skip any workflow or Agent that is not exposed to MCP.
	if (result.workflowIds.length > 0) {
		await ownerClient.setWorkflowsAvailableInMcp(result.workflowIds);
	}
	if (result.agentIds.length > 0) {
		await ownerClient.setAgentsAvailableInMcp(result.agentIds);
	}

	// The remap keeps order, so authored and restored artifacts align by index.
	return {
		workflowIds: result.workflowIds,
		agentIds: result.agentIds,
		workflowsBySeedId: new Map(
			seed.workflows.map((workflow, index) => [workflow.id, remapped.workflows[index]]),
		),
		agentsBySeedId: new Map(
			seed.agents.flatMap((agent, index) => {
				const id = result.agentIds[index];
				return id === undefined ? [] : [[agent.id, { id, name: agent.config.name }]];
			}),
		),
		tablesByName: new Map(
			remapped.dataTables.map((table, index) => [
				table.name,
				{ id: result.dataTableIds[index], name: seedTables[index].name },
			]),
		),
	};
}

/** Create the scenario tables empty, reusing a seed table of the same name, as the
 *  orchestrator path does: the seeded workflow is bound to that one. */
async function createScenarioTables(
	ownerClient: N8nClient,
	threadId: string,
	declared: InstanceAiEvalSeedDataTable[],
	seedTables: Map<string, { id: string; name: string }> = new Map(),
): Promise<{ idsByName: Record<string, string>; note: string }> {
	if (declared.length === 0) return { idsByName: {}, note: '' };
	const toCreate = declared.filter((table) => !seedTables.has(table.name));
	const schemasOnly = uniquifySeedTableNames(toCreate).map((table) => ({
		...table,
		rows: undefined,
	}));
	const { dataTableIds } =
		schemasOnly.length > 0
			? await ownerClient.restoreThread(threadId, [], [], schemasOnly, [], { uniquifyNames: false })
			: { dataTableIds: [] };
	if (dataTableIds.length !== toCreate.length) {
		throw new Error(
			`Created ${String(dataTableIds.length)} data table(s) but the case declares ${String(toCreate.length)}`,
		);
	}
	const idsByName: Record<string, string> = {};
	toCreate.forEach((table, index) => {
		idsByName[table.name] = dataTableIds[index];
	});
	const noteTables: InstanceAiEvalSeedDataTable[] = [...schemasOnly];
	for (const table of declared) {
		const reused = seedTables.get(table.name);
		if (!reused) continue;
		idsByName[table.name] = reused.id;
		noteTables.push({ ...table, name: reused.name });
	}
	return { idsByName, note: buildSeededTablesNote(noteTables) };
}

interface ResolvedAttachment {
	/** Recorded with the opening message, e.g. `[attached workflow: Order sync]`. */
	note: string;
	/** Sent only: the id `claude` needs to open the attached resource. */
	idLine: string;
	workflowId?: string;
	agentId?: string;
}

function resolveAttachment(
	opening: ConversationTurn | undefined,
	restored: RestoredArtifacts | undefined,
): ResolvedAttachment {
	const attach = opening?.attach;
	if (!attach) return { note: '', idLine: '' };
	if ('workflow' in attach) {
		const workflow = restored?.workflowsBySeedId.get(attach.workflow);
		// A missing attachment would silently turn a hand-off case into a find-it case.
		if (!workflow) {
			throw new Error(
				`The opening turn attaches seeded workflow "${attach.workflow}", but the restore produced no workflow for that id`,
			);
		}
		const clicked =
			attach.source === 'setup-panel-execute'
				? ' [The user clicked Execute in the setup panel.]'
				: '';
		return {
			note: `${attachedWorkflowNote(workflow.name)}${clicked}`,
			idLine: `The user attached the workflow "${workflow.name}" (id: ${workflow.id}).`,
			workflowId: workflow.id,
		};
	}
	const agent = restored?.agentsBySeedId.get(attach.agent);
	if (!agent) {
		throw new Error(
			`The opening turn attaches seeded Agent "${attach.agent}", but the restore produced no Agent for that id`,
		);
	}
	return {
		note: attachedAgentNote(agent.name),
		idLine: `The user attached the Agent "${agent.name}" (id: ${agent.id}).`,
		agentId: agent.id,
	};
}

/** The seeded history in the words that were said. Instance AI tool calls are left
 *  out: their names mean nothing to `claude`, and the artifacts they made exist. */
function earlierConversationText(turns: TranscriptTurn[]): string {
	const lines = turns.flatMap((turn) => {
		const reply = agentTextOf(turn);
		return [
			...(turn.userMessage ? [`User: ${turn.userMessage}`] : []),
			...(reply ? [`Assistant: ${reply}`] : []),
		];
	});
	if (lines.length === 0) return '';
	return ['This continues an earlier conversation with the user:', ...lines, '---'].join('\n\n');
}

function firstOf(ids: string[], first: string | undefined): string[] {
	if (first === undefined || !ids.includes(first)) return ids;
	return [first, ...ids.filter((id) => id !== first)];
}
