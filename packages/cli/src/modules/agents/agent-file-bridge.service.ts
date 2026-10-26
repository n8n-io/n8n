import type { AgentToolOutputFile } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { BinaryDataService } from 'n8n-core';
import { deepCopy } from 'n8n-workflow';
import type { IBinaryData, IDataObject, INodeExecutionData } from 'n8n-workflow';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import { resolveInboundMimeType } from './utils/inbound-attachments';

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
	 * Copy each `item.binary` entry into agent storage. The copy keeps the file
	 * available after the tool's execution is pruned. `files` lists the metadata
	 * of each new file. Pass the same `stored` map to calls for one tool result,
	 * so a binary that many nodes pass on is stored one time.
	 */
	async adoptFromItems(
		items: INodeExecutionData[],
		scope: AgentFileScope,
		stored = new Map<string, AgentToolOutputFile>(),
	): Promise<{ items: AdoptedItem[]; files: AgentToolOutputFile[] }> {
		const adopted: AdoptedItem[] = [];
		const files: AgentToolOutputFile[] = [];

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
					file = await this.store(key, binary, scope);
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

		return { items: adopted, files };
	}

	/**
	 * The tool already ran when this is called. A storage error must not fail
	 * the tool call, because the model can then run the tool again. Log the
	 * error and leave out the file.
	 */
	private async store(
		key: string,
		binary: IBinaryData,
		scope: AgentFileScope,
	): Promise<AgentToolOutputFile | undefined> {
		const fileName = binary.fileName ?? key;
		try {
			// ponytail: loads the whole file into memory, the same as storeInbound. Copy by ID if tools return large files.
			const data = await this.binaryDataService.getAsBuffer(binary);
			const mimeType = await resolveInboundMimeType(binary.mimeType, data);
			const attachment = await this.attachmentService.storeInbound({
				...scope,
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
