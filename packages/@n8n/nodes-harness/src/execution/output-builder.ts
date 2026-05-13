import { basename } from 'node:path';

import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import type { HarnessTaskResult } from '@n8n/task-runner-harness';

import type { ChangedFile, HarnessDiff, HarnessOutputJson, OpenCodeEvent } from '../types';

/**
 * Build the two-output result from a harness execution.
 *
 * Output 0 (Summary): Single item with diff stats, events, stdout/stderr
 * Output 1 (Files): One item per changed file with binary data
 */
export async function buildHarnessOutput(
	ctx: IExecuteFunctions,
	result: HarnessTaskResult,
	diff: HarnessDiff,
	changedFiles: ChangedFile[],
	events: OpenCodeEvent[],
	workspacePath?: string,
): Promise<INodeExecutionData[][]> {
	// --- Output 0: Summary ---
	const summaryJson: HarnessOutputJson = {
		success: result.exitCode === 0,
		exitCode: result.exitCode,
		duration: result.duration,
		stdout: result.stdout,
		stderr: result.stderr,
		diff,
		events,
		workspacePath,
	};

	const summaryItems: INodeExecutionData[] = [
		{ json: summaryJson as unknown as INodeExecutionData['json'] },
	];

	// --- Output 1: Files ---
	const fileItems: INodeExecutionData[] = [];

	for (const file of changedFiles) {
		if (file.status === 'deleted' || !file.content) {
			// Include metadata for deleted files but no binary content
			fileItems.push({
				json: {
					path: file.path,
					status: file.status,
					additions: 0,
					deletions: 0,
					patch: '',
				},
			});
			continue;
		}

		// Find the matching diff file for stats
		const diffFile = diff.files.find((f) => f.path === file.path);

		const binaryData = await ctx.helpers.prepareBinaryData(
			file.content,
			basename(file.path),
			file.mimeType,
		);
		// Override fileName with the full relative path for downstream nodes
		binaryData.fileName = file.path;

		fileItems.push({
			json: {
				path: file.path,
				status: file.status,
				additions: diffFile?.additions ?? 0,
				deletions: diffFile?.deletions ?? 0,
				patch: diffFile?.patch ?? '',
			},
			binary: { data: binaryData },
		});
	}

	// If no files changed, still return an empty array for the Files output
	if (fileItems.length === 0) {
		fileItems.push({
			json: { path: '', status: 'none', additions: 0, deletions: 0, patch: '' },
		});
	}

	return [summaryItems, fileItems];
}
