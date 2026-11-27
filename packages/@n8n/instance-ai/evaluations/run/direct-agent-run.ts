// ---------------------------------------------------------------------------
// Direct Agent runs (AGENT-1665). A case with `agentRun.mode: direct` has no
// assistant turn: the harness restores the seeded Agent into a fresh build
// project, the restore binds each model to the case's declared credential of
// its provider (TRUST-608), and the scenarios run straight against the Agent.
// The result is shaped like an agent-anchored build, so the case pipeline runs
// it through its usual agent scenario path.
// ---------------------------------------------------------------------------

import { randomUUID } from 'node:crypto';

import type { Lane } from './build-orchestrator';
import { buildProjectProvider, type BuildProject } from './lane-users';
import { createScenarioTables } from './mcp-seed';
import { createDeclaredCredentials } from '../credentials/seeder';
import { agentUnderTestIndex } from '../harness/agent-run-schema';
import type { BuildResult } from '../harness/build-workflow';
import { remapSeedArtifactIds, type ConversationSeed } from '../harness/conversation-seed';
import type { EvalLogger } from '../harness/logger';
import { dedupeScenarioSeedTables } from '../harness/seed-tables';
import { extractErrorMessage } from '../harness/transient-error';
import type { WorkflowTestCase } from '../types';

export interface DirectAgentRunConfig {
	lane: Lane;
	testCase: WorkflowTestCase;
	/** Recorded on the seed thread, as for an assistant build. */
	caseIdentity: { fileSlug: string; iteration: number };
	logger: EvalLogger;
}

/** What the setup made so far. Kept on failure too, so cleanup finds it. */
interface DirectRunState {
	project?: BuildProject;
	threadId?: string;
	workflowIds: string[];
	dataTableIds: string[];
	agentIds: string[];
	folderIds: string[];
	/** Seed table name → the table as restored, so a scenario table of that name
	 *  fills the table the Agent's tools point at. */
	seedTablesByName: Map<string, { id: string; name: string }>;
}

/**
 * Restore the case's seeded Agent and return it as an agent-anchored build.
 * Never throws: a setup failure resolves to an unsuccessful build marked
 * `seedingFailed`, which the pipeline owns as a framework issue.
 */
export async function prepareDirectAgentRun(config: DirectAgentRunConfig): Promise<BuildResult> {
	const state: DirectRunState = {
		workflowIds: [],
		dataTableIds: [],
		agentIds: [],
		folderIds: [],
		seedTablesByName: new Map(),
	};
	try {
		return await runSetup(config, state);
	} catch (error: unknown) {
		return {
			...artifactFields(state),
			success: false,
			error: `Direct Agent setup failed: ${extractErrorMessage(error)}`,
			seedingFailed: true,
		};
	}
}

async function runSetup(config: DirectAgentRunConfig, state: DirectRunState): Promise<BuildResult> {
	const seed = inlineSeedOf(config.testCase);
	state.project = await createBuildProject(config.lane);
	state.threadId = await createSeedThread(config, state.project.projectId);
	await pinDeclaredCredentials(config, state.threadId, state.project.projectId);
	await restoreSeed(config.lane, state.threadId, state, seed);
	const tableIdsByName = await createDirectScenarioTables(
		config,
		state.threadId,
		state.seedTablesByName,
	);
	addNew(state.dataTableIds, Object.values(tableIdsByName));
	config.logger.info(`  Direct Agent run: restored ${String(state.agentIds.length)} Agent(s)`);
	return successfulRun(config.testCase, state, tableIdsByName);
}

function successfulRun(
	testCase: WorkflowTestCase,
	state: DirectRunState,
	tableIdsByName: Record<string, string>,
): BuildResult {
	return {
		...artifactFields(state),
		success: true,
		artifactRefs: [agentUnderTest(testCase, state)],
		seededScenarioTableIdsByName: tableIdsByName,
		// No assistant turn, so nothing was said. Defined (not absent) because the
		// pipeline reads a transcript as "the build ran", which makes the Agent runnable.
		transcript: [],
	};
}

/** Scenario tables are created empty here and row-seeded per scenario. */
async function createDirectScenarioTables(
	config: DirectAgentRunConfig,
	threadId: string,
	seedTablesByName: DirectRunState['seedTablesByName'],
): Promise<Record<string, string>> {
	const declared = dedupeScenarioSeedTables(
		config.testCase.executionScenarios ?? [],
		config.logger,
	);
	const tables = await createScenarioTables(
		config.lane.client,
		threadId,
		declared,
		seedTablesByName,
	);
	return tables.idsByName;
}

function addNew(target: string[], ids: string[]): void {
	for (const id of ids) if (!target.includes(id)) target.push(id);
}

/** The schema guarantees an inline seed with Agents; this narrows for TS. */
function inlineSeedOf(testCase: WorkflowTestCase): ConversationSeed {
	const seed = testCase.seed;
	if (seed?.mode !== 'inline' || seed.agents.length === 0) {
		throw new Error('agentRun.mode direct needs an inline seed with at least one Agent');
	}
	return seed;
}

async function createBuildProject(lane: Lane): Promise<BuildProject> {
	const provide = buildProjectProvider(lane);
	if (provide) return await provide();
	return { projectId: await lane.client.getPersonalProjectId() };
}

/** The restore, the credential pin and the scenario tables are all scoped to a thread. */
async function createSeedThread(config: DirectAgentRunConfig, projectId: string): Promise<string> {
	const threadId = randomUUID();
	await config.lane.client.ensureThread(threadId, projectId, {
		evalCase: config.caseIdentity.fileSlug,
		evalIteration: config.caseIdentity.iteration,
	});
	return threadId;
}

/** The restore binds each model only to a pinned credential of its provider's
 *  type, so the pin has to land first. A credential the case marks broken or
 *  blank keeps its real connection test, as on an assistant build. */
async function pinDeclaredCredentials(
	config: DirectAgentRunConfig,
	threadId: string,
	projectId: string,
): Promise<void> {
	const declared = config.testCase.credentials ?? [];
	const created = await createDeclaredCredentials(config.lane.client, declared, {
		onCreated: (id) => config.lane.createdCredentialIds.add(id),
		logger: config.logger,
		projectId,
	});
	const bypass = created.filter((_, i) => declared[i]?.valid !== false && !declared[i]?.blank);
	await config.lane.client.setThreadCredentialAllowlist(
		threadId,
		created.map((credential) => credential.id),
		bypass.map((credential) => credential.id),
	);
}

/** Restore the Agents and what their tools use. No messages: there is no
 *  conversation to continue. The restore rewrites the seed table ids inside the
 *  Agents' tools to the restored tables' ids (server-side, same request). Table
 *  names stay as authored: the build project is fresh, so nothing can collide,
 *  and a tool that names its table still finds it. */
async function restoreSeed(
	lane: Lane,
	threadId: string,
	state: DirectRunState,
	seed: ConversationSeed,
): Promise<void> {
	const remapped = remapSeedArtifactIds(seed);
	const result = await lane.client.restoreThread(
		threadId,
		[],
		remapped.workflows,
		remapped.dataTables,
		remapped.agents,
		{ folders: remapped.folders, uniquifyNames: false },
	);
	state.workflowIds.push(...result.workflowIds);
	state.dataTableIds.push(...result.dataTableIds);
	state.agentIds.push(...result.agentIds);
	state.folderIds.push(...rootFolderIds(remapped, result.folderIds));
	remapped.dataTables.forEach((table, index) => {
		const id = result.dataTableIds[index];
		if (id !== undefined) state.seedTablesByName.set(table.name, { id, name: table.name });
	});
}

/** A folder delete cascades to its subfolders, so cleanup needs the roots only. */
function rootFolderIds(seed: ConversationSeed, folderIds: string[]): string[] {
	return seed.folders.flatMap((folder, index) =>
		folder.parentFolderId === undefined && folderIds[index] ? [folderIds[index]] : [],
	);
}

/** Restored ids are positional to `seed.agents`. */
function agentUnderTest(testCase: WorkflowTestCase, state: DirectRunState) {
	const seedAgents = testCase.seed?.mode === 'inline' ? testCase.seed.agents : [];
	const index = agentUnderTestIndex(testCase.agentRun, seedAgents);
	const id = state.agentIds[index];
	if (id === undefined) {
		throw new Error(`The restore produced no Agent for seed index ${String(index)}`);
	}
	return { type: 'agent' as const, id, projectId: state.project?.projectId };
}

function artifactFields(state: DirectRunState) {
	return {
		workflowJsons: [],
		createdWorkflowIds: state.workflowIds,
		createdDataTableIds: state.dataTableIds,
		createdAgentIds: state.agentIds,
		createdFolderIds: state.folderIds,
		...(state.threadId ? { seedThreadId: state.threadId } : {}),
		...(state.project ? { buildProjectId: state.project.projectId } : {}),
		...(state.project?.userId ? { buildUserId: state.project.userId } : {}),
	};
}
