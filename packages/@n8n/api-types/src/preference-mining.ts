import { z } from 'zod';

import { Z } from './zod-class';

export const preferenceMiningApproaches = [
	'baseline',
	'nodes',
	'credentials',
	'workflows',
	'threads',
	'combined',
	'folder-usage',
	'exploration-tools',
	'exploration',
] as const;

export class StartPreferenceMiningDto extends Z.class({
	approaches: z.array(z.enum(preferenceMiningApproaches)).min(1).max(9),
	discoveryTask: z
		.string()
		.trim()
		.min(1)
		.max(4000)
		.default(
			'Find reusable workflow building preferences in this project. Compare folders and environments. Inspect node choices, credentials, parameters, and recurring workflow architecture. Return scoped build instructions with separate evidence and unresolved observations.',
		),
	model: z.enum(['assistant', 'claude-sonnet-5']).default('assistant'),
	maxOutputTokens: z.number().int().min(1024).max(16384).default(16384),
	minimumWorkflows: z.number().int().min(1).max(100).default(3),
	minimumShare: z.number().min(0.5).max(1).default(0.7),
	minimumMargin: z.number().min(0).max(1).default(0.2),
}) {}

export class RecallPreferenceMiningDto extends Z.class({
	query: z.string().trim().min(1).max(4000),
	folderId: z.string().max(200).nullable().default(null),
	contexts: z.array(z.string().max(200)).max(200).default([]),
	topK: z.number().int().min(1).max(30).default(5),
}) {}

export class ListPreferenceMiningRunsDto extends Z.class({
	skip: z.coerce.number().int().min(0).default(0),
	take: z.coerce.number().int().min(1).max(50).default(20),
}) {}

export type PreferenceMiningApproach = (typeof preferenceMiningApproaches)[number];

export interface MinedPreference {
	id: string;
	key: string;
	category: 'node' | 'credential' | 'folder' | 'parameter' | 'naming' | 'architecture';
	value: string;
	content: string;
	/** The condition and instruction used by discovery candidates. */
	application?: { condition: string; instruction: string };
	evidenceSummary?: string;
	projectId: string;
	folderId: string | null;
	/** Folder subtree captured for this run. */
	folderIds?: string[];
	contexts: string[];
	origin: PreferenceMiningApproach;
	evidence: Array<{ sourceId: string; quote: string }>;
	support: number;
	share?: number;
	margin?: number;
}

export interface PreferenceMiningMetrics {
	modelCalls: number;
	inputTokens: number;
	outputTokens: number;
	cachedInputTokens: number;
	elapsedMs: number;
	estimatedCost: number | null;
	knownCost?: number;
	cacheWriteInputTokens?: number;
	usageComplete?: boolean;
	calls?: PreferenceMiningCall[];
}

export interface PreferenceMiningCall {
	stage: 'extract' | 'consolidate' | 'reflect' | 'explore';
	sourceId?: string;
	requestHash?: string;
	requestCharacters?: number;
	status: 'complete' | 'failed';
	finishReason: string | null;
	failure: 'output-limit' | 'invalid-output' | 'timeout' | 'cancelled' | 'provider-error' | null;
	validationIssues?: Array<{ path: string; code: string }>;
	usageSource: 'result' | 'steps' | 'error' | 'missing';
	usageComplete: boolean;
	inputTokens: number | null;
	outputTokens: number | null;
	cachedInputTokens: number | null;
	cacheWriteInputTokens: number | null;
	estimatedCost: number | null;
	elapsedMs: number;
}

export interface PreferenceMiningPricing {
	modelId: string;
	source: 'models.dev';
	resolvedAt: string;
	input: number;
	output: number;
	cacheRead?: number;
	cacheWrite?: number;
}

export interface PreferenceMiningContextEstimate {
	characters: number;
	tokens: number;
	encoding: 'cl100k_base';
	estimatedInputCost: number | null;
}

export interface PreferenceMiningResult {
	approach: PreferenceMiningApproach;
	status: 'complete' | 'unavailable' | 'failed';
	preferences: MinedPreference[];
	/** Evidence that does not establish a reusable choice. Excluded from recall. */
	observations?: Array<{
		content: string;
		folderId: string | null;
		evidenceIds: string[];
	}>;
	notes: string[];
	metrics: PreferenceMiningMetrics;
	trace: Array<{ stage: string; sourceId: string; accepted: number; rejected: number }>;
	discoveryTrace?: Array<{
		evidenceId: string;
		tool: string;
		input: unknown;
		output?: unknown;
		error?: string;
		elapsedMs: number;
	}>;
	timeline?: Array<{ threadId: string; preferences: MinedPreference[] }>;
	workflowCheckpoint?: {
		completedWorkflowIds: string[];
		candidates: MinedPreference[];
		completedConsolidationBatches: number;
	};
}

export interface PreferenceMiningOptions {
	assistant: { available: boolean; model: string | null };
}

export interface PreferenceMiningSources {
	workflows: number;
	totalWorkflows: number;
	threads: number;
	totalThreads: number;
	messages: number;
	credentials: number;
	folders: Array<{ id: string; name: string }>;
	contexts: string[];
	warnings: string[];
}

export interface PreferenceMiningRun {
	id: string;
	projectId: string;
	status: 'running' | 'complete' | 'cancelled' | 'failed';
	stage: string;
	createdAt?: string;
	finishedAt?: string;
	settings?: StartPreferenceMiningDto;
	persistenceError?: string;
	experiment?: {
		protocolVersion: number;
		discoveryTask?: string;
		discovery?: {
			snapshotWorkflowIds: string[];
			timeoutMs: number;
			maximumToolCalls: number;
			maximumWorkflowInspections: number;
			maximumModelSteps: number;
		};
		inputHash: string;
		workflowIds: string[];
		maximumCandidatesPerSource: number;
		consolidationBatchSize: number;
		runTimeoutMs: number;
		callTimeoutMs: number;
	};
	model?: {
		source: 'assistant';
		id: string | null;
		pricing?: PreferenceMiningPricing;
		maxOutputTokens?: number;
	};
	metrics?: PreferenceMiningMetrics;
	sources?: PreferenceMiningSources;
	results: PreferenceMiningResult[];
}

export interface PreferenceMiningRunSummary {
	id: string;
	createdAt: string;
	status: PreferenceMiningRun['status'];
	model: string | null;
	approaches: PreferenceMiningApproach[];
	preferenceCount: number;
	estimatedCost: number | null;
}

export interface PreferenceMiningRunPage {
	items: PreferenceMiningRunSummary[];
	total: number;
}

export interface PreferenceMiningRecall {
	approach: PreferenceMiningApproach;
	status: PreferenceMiningResult['status'];
	prompt: MinedPreference[];
	recall: MinedPreference[];
	estimates: {
		prompt: PreferenceMiningContextEstimate;
		recall: PreferenceMiningContextEstimate;
	} | null;
}
