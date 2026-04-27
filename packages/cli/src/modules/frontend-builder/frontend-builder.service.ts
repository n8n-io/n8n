import type {
	FrontendBuilderMessageRequestDto,
	FrontendBuilderStateResponse,
} from '@n8n/api-types';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IDataObject } from 'n8n-workflow';

import { V0Client } from './v0-client';
import type { V0ChatResult } from './v0-client.interface';

type WorkflowStaticData = IDataObject & {
	global?: IDataObject & { v0Chat?: { chatId: string } };
};

function readChatId(staticData: unknown): string | undefined {
	const sd = (staticData ?? {}) as WorkflowStaticData;
	return sd.global?.v0Chat?.chatId;
}

@Service()
export class FrontendBuilderService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly v0Client: V0Client,
	) {}

	async getState(workflowId: string): Promise<FrontendBuilderStateResponse> {
		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			select: ['id', 'staticData'],
		});
		const chatId = readChatId(workflow?.staticData);
		if (!chatId) return { chatId: null };

		const result = await this.v0Client.getChat(chatId);
		return { chatId: result.chatId, demoUrl: result.demoUrl, messages: result.messages };
	}

	async sendMessage(
		workflowId: string,
		body: FrontendBuilderMessageRequestDto,
	): Promise<V0ChatResult> {
		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			select: ['id', 'active', 'staticData'],
		});
		if (!workflow) throw new Error(`workflow not found: ${workflowId}`);

		const staticData = (workflow.staticData ?? {}) as WorkflowStaticData;
		const existingChatId = staticData.global?.v0Chat?.chatId;

		// Slice 1: prompt is just the raw user prompt. Slice 4 upgrades this.
		const message = body.prompt;

		const result = existingChatId
			? await this.v0Client.sendMessage({ chatId: existingChatId, message })
			: await this.v0Client.create({ message });

		if (!existingChatId) {
			const nextStaticData: WorkflowStaticData = {
				...staticData,
				global: { ...(staticData.global ?? {}), v0Chat: { chatId: result.chatId } },
			};
			await this.workflowRepository.update({ id: workflowId }, { staticData: nextStaticData });
		}

		return result;
	}
}
