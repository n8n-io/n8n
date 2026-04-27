import type {
	FrontendBuilderMessageRequestDto,
	FrontendBuilderStateResponse,
} from '@n8n/api-types';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IDataObject } from 'n8n-workflow';

import { buildV0Prompt } from './core/build-v0-prompt';
import { sanitizeEndpointExamples } from './core/sanitize-endpoint-examples';
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

	/**
	 * Forget the workflow's link to its v0 chat. The chat itself is not
	 * deleted on v0 — the user can still reach it through v0 directly with
	 * the chatId. We just disown it from the workflow so the next message
	 * starts a fresh conversation.
	 */
	async clearChat(workflowId: string): Promise<void> {
		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			select: ['id', 'staticData'],
		});
		if (!workflow) return;

		const staticData = (workflow.staticData ?? {}) as WorkflowStaticData;
		if (!staticData.global?.v0Chat) return;

		const { v0Chat: _v0Chat, ...restGlobal } = staticData.global;
		const nextStaticData: WorkflowStaticData = { ...staticData, global: restGlobal };

		await this.workflowRepository.update({ id: workflowId }, { staticData: nextStaticData });
	}

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

		const message = buildV0Prompt({
			userPrompt: body.prompt,
			endpoints: body.endpoints.map((ep) => ({
				...ep,
				requestExample:
					ep.requestExample !== undefined ? sanitizeEndpointExamples(ep.requestExample) : undefined,
				responseExample:
					ep.responseExample !== undefined
						? sanitizeEndpointExamples(ep.responseExample)
						: undefined,
			})),
		});

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
