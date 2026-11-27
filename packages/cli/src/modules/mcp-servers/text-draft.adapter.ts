import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { TextDraftPort, type TextDraftResult } from '@n8n/backend-module-mcp-servers';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { randomUUID } from 'node:crypto';
import { hasGlobalScope } from '@n8n/permissions';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';

import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

const DRAFT_TIMEOUT_MS = 30_000;

/** A tool name and a short description fit in far less. The cap stops a runaway answer. */
const DRAFT_MAX_OUTPUT_TOKENS = 1_000;

/** Drafts have no Assistant thread. The credit claim still bills the person. */
const DRAFT_CREDIT_THREAD_ID = 'mcp-server-tool-drafts';

/**
 * Text drafts of custom MCP servers, written by the model of the n8n Assistant. A draft first
 * checks the credit balance of the person, as an Assistant run does, and then claims the credits
 * of its model call.
 */
@Service()
export class TextDraftAdapter extends TextDraftPort {
	constructor(
		private readonly moduleRegistry: ModuleRegistry,
		private readonly outboundHttp: OutboundHttp,
		private readonly logger: Logger,
	) {
		super();
	}

	async isAvailable(user: User): Promise<boolean> {
		if (!this.moduleRegistry.isActive('instance-ai')) return false;
		if (!hasGlobalScope(user, 'instanceAi:message')) return false;
		// The Assistant module owns these services. Load them only when the module is active.
		const { InstanceAiSettingsService } = await import(
			'@/modules/instance-ai/instance-ai-settings.service.js'
		);
		const settings = Container.get(InstanceAiSettingsService);
		return settings.isInstanceAiEnabled() && (await settings.isModelConfigured());
	}

	async draft(user: User, prompt: string): Promise<TextDraftResult> {
		if (!(await this.isAvailable(user))) return { status: 'not_available' };
		const { InstanceAiModelService } = await import(
			'@/modules/instance-ai/instance-ai-model.service.js'
		);
		const models = Container.get(InstanceAiModelService);
		if (await this.creditsExhausted(models, user)) return { status: 'no_credits' };
		try {
			const modelConfig = await models.resolveAgentModelConfig(user);
			const { createModel, getCatalogModelId } = await import('@n8n/agents');
			const { generateText } = await import('ai');
			const { text, usage } = await generateText({
				model: createModel(modelConfig, createAiProxyFetch(this.outboundHttp)),
				prompt,
				maxOutputTokens: DRAFT_MAX_OUTPUT_TOKENS,
				abortSignal: AbortSignal.timeout(DRAFT_TIMEOUT_MS),
			});
			await this.claimCredits(user, getCatalogModelId(modelConfig), usage);
			return { status: 'drafted', text };
		} catch (error) {
			// Providers can echo credentials in error messages.
			this.logger.warn('The n8n Assistant could not write a tool draft', {
				error: sanitizeErrorDetail(ensureError(error).message, 512),
			});
			throw error;
		}
	}

	/** A failed balance read lets the draft run, as for an Assistant run. */
	private async creditsExhausted(
		models: { getCredits(user: User): Promise<{ creditsQuota: number; creditsClaimed: number }> },
		user: User,
	): Promise<boolean> {
		try {
			const { isAssistantCreditBalanceExhausted } = await import(
				'@/modules/instance-ai/turn-setup/assistant-credits.js'
			);
			return isAssistantCreditBalanceExhausted(await models.getCredits(user));
		} catch (error) {
			this.logger.debug('Skipped the credit check of a tool draft', {
				error: ensureError(error).message,
			});
			return false;
		}
	}

	/** Best effort: the claim service logs its own failures, and a draft never fails on billing. */
	private async claimCredits(
		user: User,
		model: string,
		usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined,
	): Promise<void> {
		if (!usage) return;
		const { InstanceAiCreditService } = await import(
			'@/modules/instance-ai/instance-ai-credit.service.js'
		);
		const promptTokens = usage.inputTokens ?? 0;
		const completionTokens = usage.outputTokens ?? 0;
		await Container.get(InstanceAiCreditService).claimSideCallUsage(
			user,
			DRAFT_CREDIT_THREAD_ID,
			`mcp-server-tool-draft:${randomUUID()}`,
			{
				model,
				usage: {
					promptTokens,
					completionTokens,
					totalTokens: usage.totalTokens ?? promptTokens + completionTokens,
				},
			},
		);
	}
}
