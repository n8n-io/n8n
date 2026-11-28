import { MAX_APPROVAL_FILE_NAMES } from '@n8n/api-types';
import type { IBinaryData, IBinaryKeyData } from 'n8n-workflow';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

/**
 * The file reads and writes that let a workflow run or a node run take
 * conversation files and return its files. Only hosts that store conversation
 * files set them.
 */
export function workflowFilesOf(context: InstanceAiContext) {
	const { storedFiles } = context;
	const readBinary = storedFiles?.readBinary?.bind(storedFiles);
	const storeWorkflowFile = storedFiles?.storeWorkflowFile?.bind(storedFiles);
	return readBinary && storeWorkflowFile ? { readBinary, storeWorkflowFile } : undefined;
}

export type WorkflowFiles = NonNullable<ReturnType<typeof workflowFilesOf>>;

/** The `files` field of an input item, for tools that give items to a run. */
export const inputItemFilesSchema = z
	.record(z.string(), z.string())
	.optional()
	.describe(
		'Files of this conversation to give this item as binary data. ' +
			'Key = binary property name (usually "data"), value = fileId, such as the fileId of a user upload, ' +
			'of a file from `share-files`, or of a file that a run returned.',
	);

/**
 * The binary data entries of files that one call already read, by fileId. An
 * entry is a reference to the stored bytes, never the bytes, so it stays small.
 */
type ReadFiles = Map<string, IBinaryData | undefined>;

/**
 * Resolve `files` (binary property name to fileId) to binary data entries.
 * Gives an error message for a fileId that the conversation does not have.
 */
export async function readInputFiles(
	workflowFiles: WorkflowFiles,
	files: Record<string, string> | undefined,
	readFiles: ReadFiles = new Map(),
): Promise<{ binary?: IBinaryKeyData; error?: string }> {
	if (!files || Object.keys(files).length === 0) return {};
	const entries = new Map<string, IBinaryData>();
	for (const [key, fileId] of Object.entries(files)) {
		if (!readFiles.has(fileId)) readFiles.set(fileId, await workflowFiles.readBinary(fileId));
		const entry = readFiles.get(fileId);
		if (!entry) return { error: `File "${fileId}" not found in this conversation` };
		// A copy for each item, so a node that changes one entry does not change the others.
		entries.set(key, { ...entry });
	}
	// A plain object would take a `__proto__` key as its prototype. `fromEntries` defines
	// own properties only, so no key from the model can change a prototype.
	return { binary: Object.fromEntries(entries) };
}

export interface InputItem {
	json: Record<string, unknown>;
	binary?: IBinaryKeyData;
}

/**
 * Resolve the `files` of each input item to binary data. Reads each fileId one
 * time, however many items use it.
 */
export async function readItemFiles(
	workflowFiles: WorkflowFiles | undefined,
	items: Array<{ json: Record<string, unknown>; files?: Record<string, string> }>,
): Promise<{ items: InputItem[]; error?: undefined } | { error: string }> {
	const readFiles: ReadFiles = new Map();
	const result: InputItem[] = [];
	for (const { json, files } of items) {
		const { binary, error } = workflowFiles
			? await readInputFiles(workflowFiles, files, readFiles)
			: {};
		if (error) return { error };
		result.push(binary ? { json, binary } : { json });
	}
	return { items: result };
}

/**
 * The names of the files that a run gets, one time for each file. The names
 * come from the stored files, not from the model.
 */
function inputFileNames(binaries: Array<IBinaryKeyData | undefined>): string[] {
	const names = new Map<IBinaryData | string, string>();
	for (const entry of binaries.flatMap((binary) => Object.values(binary ?? {}))) {
		names.set(entry.id ?? entry, entry.fileName ?? 'file');
	}
	return [...names.values()];
}

/** The files that the approval card lists. Empty when the run gets no files. */
export function approvalFilesOf(binaries: Array<IBinaryKeyData | undefined>): {
	files?: string[];
	moreFiles?: number;
} {
	const names = inputFileNames(binaries);
	if (names.length === 0) return {};
	const more = names.length - MAX_APPROVAL_FILE_NAMES;
	return {
		files: names.slice(0, MAX_APPROVAL_FILE_NAMES),
		...(more > 0 ? { moreFiles: more } : {}),
	};
}

/**
 * The approval message names the files that a run gets, because the run can
 * send them to an outside service. Empty when the run gets no files.
 */
export function describeInputFiles(binaries: Array<IBinaryKeyData | undefined>): string {
	const { files, moreFiles } = approvalFilesOf(binaries);
	if (!files) return '';
	const count = files.length + (moreFiles ?? 0);
	return ` with ${count === 1 ? 'the file' : 'the files'} ${files.join(', ')}${moreFiles ? ` and ${moreFiles} more` : ''}`;
}
