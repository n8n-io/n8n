import * as fs from 'fs';
import { jsonParse } from 'n8n-workflow';
import * as path from 'path';

import type { CoordinationLogEntry } from '@/types/coordination';
import type { SimpleWorkflow } from '@/types/workflow';

import type { SerializedMessage } from '../harness/workflow-regenerator';

interface DatasetExample {
	prompt: string;
	messages: unknown[];
	coordinationLog: unknown[];
	workflowJSON: Record<string, unknown>;
	responderEvals?: { type: string; criteria: string };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateExample(raw: unknown, index: number): DatasetExample {
	if (!isRecord(raw)) {
		throw new Error(`Dataset example at index ${index} is not an object`);
	}

	if (typeof raw.prompt !== 'string' || raw.prompt.length === 0) {
		throw new Error(`Dataset example at index ${index} missing required "prompt" string`);
	}

	if (!Array.isArray(raw.messages)) {
		throw new Error(`Dataset example at index ${index} missing required "messages" array`);
	}

	if (!Array.isArray(raw.coordinationLog)) {
		throw new Error(`Dataset example at index ${index} missing required "coordinationLog" array`);
	}

	if (!isRecord(raw.workflowJSON)) {
		throw new Error(`Dataset example at index ${index} missing required "workflowJSON" object`);
	}

	return raw as unknown as DatasetExample;
}

/**
 * Load and validate a local JSON dataset file for subgraph evaluation.
 * Returns parsed examples with their inputs structured for the subgraph runner.
 */
export function loadSubgraphDatasetFile(
	filePath: string,
): Array<{ inputs: Record<string, unknown> }> {
	const resolved = path.resolve(filePath);

	if (!fs.existsSync(resolved)) {
		throw new Error(`Dataset file not found: ${resolved}`);
	}

	const content = fs.readFileSync(resolved, 'utf-8');
	let parsed: unknown;

	try {
		parsed = JSON.parse(content);
	} catch {
		throw new Error(`Failed to parse dataset file as JSON: ${resolved}`);
	}

	if (!Array.isArray(parsed) || parsed.length === 0) {
		throw new Error(`Dataset file must contain a non-empty JSON array: ${resolved}`);
	}

	return parsed.map((raw, index) => {
		const example = validateExample(raw, index);
		return {
			inputs: {
				prompt: example.prompt,
				messages: example.messages,
				coordinationLog: example.coordinationLog,
				workflowJSON: example.workflowJSON,
				...(example.responderEvals ? { responderEvals: example.responderEvals } : {}),
			},
		};
	});
}

/** Entry for write-back operations */
export interface DatasetWriteBackEntry {
	index: number;
	messages: SerializedMessage[];
	coordinationLog: CoordinationLogEntry[];
	workflowJSON: SimpleWorkflow;
}

/**
 * Write regenerated state back to the dataset file.
 * Preserves existing fields (prompt, responderEvals) and updates state fields.
 */
export function writeBackToDatasetFile(filePath: string, updates: DatasetWriteBackEntry[]): void {
	const resolved = path.resolve(filePath);
	const content = fs.readFileSync(resolved, 'utf-8');
	const dataset = jsonParse<unknown[]>(content);

	for (const update of updates) {
		if (update.index < 0 || update.index >= dataset.length) {
			throw new Error(
				`Write-back index ${update.index} is out of bounds (dataset has ${dataset.length} examples)`,
			);
		}
		const example = dataset[update.index] as Record<string, unknown>;
		example.messages = update.messages;
		example.coordinationLog = update.coordinationLog;
		example.workflowJSON = update.workflowJSON;
	}

	fs.writeFileSync(resolved, JSON.stringify(dataset, null, '\t') + '\n', 'utf-8');
}
