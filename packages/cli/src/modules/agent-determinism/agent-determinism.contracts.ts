import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { GeneratedFromSourceType, JsonObject, JsonValue } from 'n8n-workflow';

export type DeterminismSource = {
	type: GeneratedFromSourceType;
	id: string;
	projectId: string;
	name: string;
	versionHash: string;
};

export type StepCounts = { llmDecided: number; codeDecided: number };

export type RecordedToolCall = { name: string; input: JsonValue; output: JsonValue };

export type RecordedRun = {
	id: string;
	succeeded: boolean;
	input: JsonObject;
	output: JsonValue;
	toolCalls: RecordedToolCall[];
	steps: StepCounts;
	totalTokens: number | null;
};

export type RunCluster = {
	key: string;
	toolSequence: string[];
	runs: RecordedRun[];
	trafficShare: number;
};

export type TranslateRequest = {
	source: DeterminismSource;
	cluster: RunCluster;
	trainRuns: RecordedRun[];
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
};

export abstract class RunCollector {
	abstract collect(source: DeterminismSource, limit: number): Promise<RecordedRun[]>;
}

export abstract class RunClusterer {
	abstract cluster(runs: RecordedRun[]): RunCluster[];
}

export abstract class WorkflowTranslator {
	abstract translate(request: TranslateRequest): Promise<WorkflowJSON>;
}
