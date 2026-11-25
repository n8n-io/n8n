import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { TextDraftPort, type TextDraftResult } from '@n8n/backend-module-mcp-servers';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';

import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

const DRAFT_TIMEOUT_MS = 30_000;

/** A tool name and a short description fit in far less. The cap stops a runaway answer. */
const DRAFT_MAX_OUTPUT_TOKENS = 1_000;

/**
 * Text drafts of custom MCP servers, written by the model of the n8n Assistant. With the AI
 * proxy, the Assistant bills a call only when it claims the usage. A draft claims nothing yet,
 * because `InstanceAiCreditService.claimSideCallUsage` needs a thread.
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
		try {
			const { InstanceAiModelService } = await import(
				'@/modules/instance-ai/instance-ai-model.service.js'
			);
			const modelConfig = await Container.get(InstanceAiModelService).resolveAgentModelConfig(user);
			const { createModel } = await import('@n8n/agents');
			const { generateText } = await import('ai');
			const { text } = await generateText({
				model: createModel(modelConfig, createAiProxyFetch(this.outboundHttp)),
				prompt,
				maxOutputTokens: DRAFT_MAX_OUTPUT_TOKENS,
				abortSignal: AbortSignal.timeout(DRAFT_TIMEOUT_MS),
			});
			return { status: 'drafted', text };
		} catch (error) {
			// Providers can echo credentials in error messages.
			this.logger.warn('The n8n Assistant could not write a tool draft', {
				error: sanitizeErrorDetail(ensureError(error).message, 512),
			});
			throw error;
		}
	}
}
