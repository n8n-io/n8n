import {
	MAX_AGENT_CHAT_ATTACHMENT_FILENAME_LENGTH,
	MAX_AGENT_TOOL_OUTPUT_FILE_BYTES,
	type AgentToolOutputFile,
	type AgentToolSkippedFile,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { isRecord } from '@n8n/utils/is-record';
import { extension } from 'mime-types';
import { BinaryDataService } from 'n8n-core';
import { deepCopy, UserError } from 'n8n-workflow';
import type { IBinaryData, IBinaryKeyData, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { z } from 'zod';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import { resolveInboundMimeType } from './utils/inbound-attachments';

/** Optional tool input. The model passes file IDs from the chat or from other tool results. */
export const FILES_INPUT_SCHEMA = z
	.record(z.string(), z.string())
	.optional()
	.describe(
		'Files to pass to the tool. Key = binary property name (usually "data"), value = fileId.',
	);

export interface AgentFileScope {
	/** Null for inline agents, which have no `agents` row. */
	agentId: string | null;
	projectId: string;
	/** Thread of the run that called the tool. The root thread of its tree owns the file. */
	threadId: string;
}

/** A tool output item with each binary entry replaced by its file ID. */
export interface AdoptedItem {
	json: IDataObject;
	binary?: IDataObject;
}

/**
 * Converts workflow binary data to agent file references. A tool file is an
 * `agent_chat_attachments` row with source 'tool', so the model, the chat UI
 * and later tools use the same file ID as for user uploads.
 */
@Service()
export class AgentFileBridge {
	constructor(
		private readonly logger: Logger,
		private readonly binaryDataService: BinaryDataService,
		private readonly attachmentService: AgentChatAttachmentService,
	) {}

	/**
	 * Resolve the `files` tool input to binary entries for an input item. Each
	 * entry points to the stored bytes, so nothing is copied. Only files that
	 * the thread can read resolve. Pass `stored` to {@link adoptFromItems}, so
	 * an input file that the tool returns unchanged keeps its file ID.
	 */
	async toBinary(
		input: unknown,
		scope: { projectId: string; threadId?: string },
	): Promise<{ binary: IBinaryKeyData; stored: Map<string, AgentToolOutputFile> } | undefined> {
		const files = FILES_INPUT_SCHEMA.parse(input);
		if (!files || Object.keys(files).length === 0) return undefined;
		const { threadId } = scope;
		if (!threadId) throw new UserError('Files can only be passed to tools in a conversation');

		const binary: IBinaryKeyData = {};
		const stored = new Map<string, AgentToolOutputFile>();
		for (const [key, fileId] of Object.entries(files)) {
			const attachment = await this.attachmentService.getReadable(fileId, {
				projectId: scope.projectId,
				threadId,
			});
			if (!attachment) throw new UserError(`File "${fileId}" not found in this conversation`);
			const { fileName } = attachment;
			const fileExtension = hasExtension(fileName)
				? fileName.slice(fileName.lastIndexOf('.') + 1)
				: undefined;
			binary[key] = {
				id: attachment.binaryDataId,
				// A stored binary keeps its storage mode in `data`, as BinaryDataService.store does.
				data: attachment.binaryDataId.split(':')[0],
				mimeType: attachment.mimeType,
				fileName: attachment.fileName,
				...(fileExtension && { fileExtension }),
				bytes: attachment.fileSizeBytes,
			};
			stored.set(attachment.binaryDataId, {
				fileId,
				fileName: attachment.fileName,
				mimeType: attachment.mimeType,
				sizeBytes: attachment.fileSizeBytes,
			});
		}
		return { binary, stored };
	}

	/**
	 * Copy each `item.binary` entry into agent storage. The copy keeps the file
	 * available after the tool's execution is pruned. `files` lists the metadata
	 * of each new file, and `skippedFiles` the files that are too large to store.
	 * Pass the same `stored` map and `skipped` set to calls for one tool result,
	 * so a binary that many nodes pass on is stored or skipped one time.
	 */
	async adoptFromItems(
		items: INodeExecutionData[],
		scope: AgentFileScope,
		stored = new Map<string, AgentToolOutputFile>(),
		skipped = new Set<string>(),
	): Promise<{
		items: AdoptedItem[];
		files: AgentToolOutputFile[];
		skippedFiles: AgentToolSkippedFile[];
	}> {
		const adopted: AdoptedItem[] = [];
		const files: AgentToolOutputFile[] = [];
		const skippedFiles: AgentToolSkippedFile[] = [];

		for (const item of items) {
			if (!item.binary) {
				adopted.push({ json: item.json });
				continue;
			}

			const fileIds: IDataObject = {};
			const fileIdsByBinaryId = new Map<string, string>();
			for (const [key, binary] of Object.entries(item.binary)) {
				let file = binary.id ? stored.get(binary.id) : undefined;
				if (!file) {
					if (binary.id && skipped.has(binary.id)) continue;
					if (await this.isTooLarge(binary)) {
						if (binary.id) skipped.add(binary.id);
						skippedFiles.push({
							fileName: binary.fileName ?? key,
							reason: `larger than ${MAX_AGENT_TOOL_OUTPUT_FILE_BYTES / 1024 / 1024} MB`,
						});
						continue;
					}
					file = await this.store(binary, scope);
					if (!file) continue;
					if (binary.id) stored.set(binary.id, file);
					files.push(file);
				}
				fileIds[key] = file.fileId;
				if (binary.id) fileIdsByBinaryId.set(binary.id, file.fileId);
			}
			// Some nodes copy the binary metadata into `json`. Replace the internal storage ID there too, so it does not go to the model.
			const json = fileIdsByBinaryId.size ? deepCopy(item.json) : item.json;
			replaceBinaryIds(json, fileIdsByBinaryId);
			adopted.push({ json, binary: fileIds });
		}

		return { items: adopted, files, skippedFiles };
	}

	/** Read the size from the metadata, so the bytes are not loaded. An unknown size is not too large. */
	private async isTooLarge(binary: IBinaryData): Promise<boolean> {
		let size = binary.bytes;
		if (size === undefined && binary.id) {
			try {
				size = (await this.binaryDataService.getMetadata(binary.id)).fileSize;
			} catch {
				// The size stays unknown, so the file is stored as before.
			}
		}
		// Without an ID the bytes are already in memory as base64.
		if (size === undefined && !binary.id) size = Buffer.byteLength(binary.data, 'base64');
		const tooLarge = size !== undefined && size > MAX_AGENT_TOOL_OUTPUT_FILE_BYTES;
		if (tooLarge) {
			this.logger.warn('Skipped an agent tool output file that is too large', {
				fileName: binary.fileName,
				size,
			});
		}
		return tooLarge;
	}

	/**
	 * The tool already ran when this is called. A storage error must not fail
	 * the tool call, because the model can then run the tool again. Log the
	 * error and leave out the file.
	 */
	private async store(
		binary: IBinaryData,
		scope: AgentFileScope,
	): Promise<AgentToolOutputFile | undefined> {
		const id = generateNanoId();
		let fileName = binary.fileName ?? id;
		try {
			// ponytail: loads the whole file (up to MAX_AGENT_TOOL_OUTPUT_FILE_BYTES) into memory, the same as storeInbound. Copy by ID if that is too much.
			const data = await this.binaryDataService.getAsBuffer(binary);
			const mimeType = await resolveInboundMimeType(binary.mimeType, data);
			if (!hasExtension(fileName) || fileName.length > MAX_AGENT_CHAT_ATTACHMENT_FILENAME_LENGTH) {
				// Some nodes set no file name, a fixed one such as "data", or one too long for the column. Use the file ID, so each file has a unique, usable name.
				const ext = binary.fileExtension ?? (extension(mimeType) || undefined);
				fileName = ext ? `${id}.${ext}` : id;
			}
			const attachment = await this.attachmentService.storeInbound({
				...scope,
				id,
				source: 'tool',
				fileName,
				mimeType,
				data,
			});
			return { fileId: attachment.id, fileName, mimeType, sizeBytes: attachment.fileSizeBytes };
		} catch (error) {
			this.logger.warn('Failed to store agent tool output file', { fileName, error });
			return undefined;
		}
	}
}

/** Replace in place each string that is equal to a binary ID with the file ID of that binary. */
function replaceBinaryIds(target: unknown, fileIdsByBinaryId: ReadonlyMap<string, string>): void {
	if (!fileIdsByBinaryId.size || (!isRecord(target) && !Array.isArray(target))) return;
	for (const [key, value] of Object.entries(target)) {
		const fileId = typeof value === 'string' ? fileIdsByBinaryId.get(value) : undefined;
		if (fileId) Reflect.set(target, key, fileId);
		else replaceBinaryIds(value, fileIdsByBinaryId);
	}
}

/** True when the name has a non-empty part after its last dot. A leading dot only (".env") is not an extension. */
function hasExtension(fileName: string): boolean {
	const dot = fileName.lastIndexOf('.');
	return dot > 0 && dot < fileName.length - 1;
}
