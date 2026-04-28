import type {
	FrontendBuilderMessageRequestDto,
	FrontendBuilderStateResponse,
} from '@n8n/api-types';
import { WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import type { IDataObject } from 'n8n-workflow';

import { ResponseError } from '@/errors/response-errors/abstract/response.error';

import { buildV0Prompt } from './core/build-v0-prompt';
import { V0UpstreamError } from './frontend-builder.errors';
import { sanitizeEndpointExamples } from './core/sanitize-endpoint-examples';
import { V0Client } from './v0-client';
import type { IV0Client, V0ChatResult } from './v0-client.interface';

type WorkflowStaticData = IDataObject & {
	global?: IDataObject & { v0Chat?: { chatId: string } };
};

function readChatId(staticData: unknown): string | undefined {
	const sd = (staticData ?? {}) as WorkflowStaticData;
	return sd.global?.v0Chat?.chatId;
}

@Service()
export class FrontendBuilderService {
	constructor(private readonly workflowRepository: WorkflowRepository) {}

	/**
	 * Resolve V0Client per-call instead of via constructor injection. This lets
	 * the module swap implementations (real vs fake) at runtime, and lets tests
	 * substitute a throwing stub mid-suite via `Container.set(V0Client, ...)`.
	 */
	private get v0Client(): IV0Client {
		return Container.get(V0Client);
	}

	/**
	 * Wrap any call into v0 so unexpected throws surface as a 502 with the
	 * underlying message. Re-throws ResponseErrors unchanged so they keep
	 * their original status (e.g. 4xx validation we choose to raise from
	 * inside the v0 wrapper if needed in the future).
	 */
	private async callV0<T>(label: string, fn: () => Promise<T>): Promise<T> {
		try {
			return await fn();
		} catch (err) {
			if (err instanceof ResponseError) throw err;
			const message = err instanceof Error ? err.message : String(err);
			throw new V0UpstreamError(`Frontend generation failed (${label}): ${message}`, err);
		}
	}

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

		const result = await this.callV0('getChat', () => this.v0Client.getChat(chatId));
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

		const result = await this.callV0('sendMessage', () =>
			existingChatId
				? this.v0Client.sendMessage({ chatId: existingChatId, message })
				: this.v0Client.create({ message }),
		);

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
