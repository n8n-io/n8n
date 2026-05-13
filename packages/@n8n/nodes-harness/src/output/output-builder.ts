import { basename } from 'node:path';

import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import type {
	ChangedFile,
	CliExecutionResult,
	HarnessDiff,
	HarnessEvent,
	HarnessSummaryOutput,
} from '../types';

/**
 * Build the two-output result from a harness execution.
 *
 * Output 0 (Summary): Single item with execution metadata, structured diff, and events.
 * Output 1 (Files):   One item per changed file with binary data + metadata.
 */
export async function buildHarnessOutput(
	ctx: IExecuteFunctions,
	result: CliExecutionResult,
	diff: HarnessDiff,
	changedFiles: ChangedFile[],
	events: HarnessEvent[],
	workspacePath: string | null,
): Promise<INodeExecutionData[][]> {
	// --- Output 0: Summary ---
	const summaryJson: HarnessSummaryOutput = {
		success: result.exitCode === 0,
		exitCode: result.exitCode,
		duration: result.duration,
		diff: {
			stats: diff.stats,
			files: diff.files.map((f) => ({
				path: f.path,
				status: f.status,
				additions: f.additions,
				deletions: f.deletions,
				patch: f.patch,
			})),
			unified: diff.unified,
		},
		events,
		workspacePath,
		stdout: result.stdout,
		stderr: result.stderr,
	};

	const summaryItems: INodeExecutionData[] = [{ json: summaryJson, pairedItem: { item: 0 } }];

	// --- Output 1: Files ---
	const fileItems: INodeExecutionData[] = [];

	for (const file of changedFiles) {
		// Find the matching diff file for stats.
		const diffFile = diff.files.find((f) => f.path === file.path);

		if (file.status === 'deleted' || !file.content) {
			// Include metadata for deleted files but no binary content.
			fileItems.push({
				json: {
					path: file.path,
					fileName: basename(file.path),
					status: file.status,
					mimeType: file.mimeType,
					additions: 0,
					deletions: diffFile?.deletions ?? 0,
				},
				pairedItem: { item: 0 },
			});
			continue;
		}

		const binaryData = await ctx.helpers.prepareBinaryData(
			file.content,
			basename(file.path),
			file.mimeType,
		);
		// Override fileName with the full relative path so downstream nodes
		// can reconstruct directory structure.
		binaryData.fileName = file.path;

		fileItems.push({
			json: {
				path: file.path,
				fileName: basename(file.path),
				status: file.status,
				mimeType: file.mimeType,
				additions: diffFile?.additions ?? 0,
				deletions: diffFile?.deletions ?? 0,
			},
			binary: { data: binaryData },
			pairedItem: { item: 0 },
		});
	}

	// n8n requires at least one item per output.
	if (fileItems.length === 0) {
		fileItems.push({ json: {}, pairedItem: { item: 0 } });
	}

	return [summaryItems, fileItems];
}
