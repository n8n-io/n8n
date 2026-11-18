import type { User } from '@n8n/db';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { JSONObject, JSONValue } from '@n8n/utils/json/to-json-value';
import type { GeneratedFromSourceType } from 'n8n-workflow';

export type DeterminismSource = {
	type: GeneratedFromSourceType;
	id: string;
	projectId: string;
	name: string;
	versionHash: string;
};

export type StepCounts = { llmDecided: number; codeDecided: number };

export type RecordedToolCall = {
	name: string;
	/** `undefined` when the source did not keep it (redacted data, or no `inputOverride`). */
	input?: JSONValue;
	output?: JSONValue;
	/** False when the call failed, so a retry of the same tool counts as one step. */
	ok: boolean;
	/** Index of the model step that made the call. Calls of one step ran in parallel. */
	step?: number;
};

export type RecordedRun = {
	id: string;
	/** How the run started: `schedule` for scheduled runs, else `chat`, `webhook` and so on. */
	trigger: string;
	succeeded: boolean;
	input: JSONObject;
	output: JSONValue;
	toolCalls: RecordedToolCall[];
	steps: StepCounts;
	totalTokens: number | null;
	/** When the run started (ISO). Replays read it as the current time instead of the replay's own clock. */
	startedAt?: string;
};

export type RunCluster = {
	key: string;
	toolSequence: string[];
	runs: RecordedRun[];
	trafficShare: number;
};

/** A train run that the previous draft got wrong in replay, with what the draft did. */
/** `steps`: what each draft node put out in the replay, so the next draft can see where it went wrong. */
export type ReplayFailure = {
	run: RecordedRun;
	got: JSONValue | null;
	steps?: string;
	why?: string;
};

export type TranslateRequest = {
	actor: User;
	source: DeterminismSource;
	cluster: RunCluster;
	trainRuns: RecordedRun[];
	feedback?: ReplayFailure[];
};

export type DeterminismResult = {
	baselinePct: number;
	effectivePct: number;
	gainPoints: number;
	matchRate: number;
	holdoutRuns: number;
	totalRuns: number;
	tokenDelta: number | null;
	clusterTrafficShare: number;
	showCta: boolean;
	/** Hash of the draft as the analysis saved it: a different hash later means a person edited it. */
	draftHash?: string;
};

export abstract class RunCollector {
	abstract collect(source: DeterminismSource, limit: number): Promise<RecordedRun[]>;
}

export abstract class RunClusterer {
	abstract cluster(runs: RecordedRun[]): RunCluster[];
}

export abstract class WorkflowTranslator {
	abstract translate(request: TranslateRequest): Promise<WorkflowJSON>;
	/** The agent's instructions: what a correct run does. */
	abstract instructions(source: DeterminismSource): Promise<string>;
}
