/**
 * LangSmith dataset write-back utilities.
 *
 * Provides functions to update examples in a LangSmith dataset
 * with regenerated state.
 */

import type { Client as LangsmithClient } from 'langsmith/client';

import type { CoordinationLogEntry } from '@/types/coordination';
import type { SimpleWorkflow } from '@/types/workflow';

import type { EvalLogger } from './logger';
import type { SerializedMessage } from './workflow-regenerator';

/** Entry for LangSmith write-back operations */
export interface LangSmithWriteBackEntry {
	exampleId: string;
	messages: SerializedMessage[];
	coordinationLog: CoordinationLogEntry[];
	workflowJSON: SimpleWorkflow;
}

/**
 * Write regenerated state back to a LangSmith dataset.
 * Updates the inputs field of each example while preserving other fields.
 */
export async function writeBackToLangSmithDataset(
	client: LangsmithClient,
	updates: LangSmithWriteBackEntry[],
	logger?: EvalLogger,
): Promise<void> {
	if (updates.length === 0) {
		logger?.verbose('No updates to write back to LangSmith');
		return;
	}

	logger?.info(`Writing back ${updates.length} examples to LangSmith dataset...`);

	// Use batch update for efficiency
	const exampleUpdates = updates.map((update) => ({
		id: update.exampleId,
		inputs: {
			messages: update.messages,
			coordinationLog: update.coordinationLog,
			workflowJSON: update.workflowJSON,
		},
	}));

	await client.updateExamples(exampleUpdates);

	logger?.info(`Successfully updated ${updates.length} examples in LangSmith`);
}
