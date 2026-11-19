import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { INTEGRATION_ERROR_CODES } from './integration-error-codes';
import { readIntegrationMessageContext } from './integration-message-context';
import {
	INTEGRATION_ACTION_SUSPEND_SCHEMA,
	executeIntegrationActionTool,
	type IntegrationActionToolParams,
} from './integration-tool-factory';
import {
	INTEGRATION_ACTION_RESUME_SCHEMA,
	isSilentActionOutput,
} from './integration-tool-execution';
import { CONVERSATION_TOOL_NAMES } from './integration-tool-types';

const doNotRespondSchema = z
	.object({
		reason: z
			.string()
			.min(1)
			.max(200)
			.optional()
			.describe('Reason for the run record. It is not sent.'),
	})
	.strict();

/** Attach one tool of each kind. Route calls through the current turn's channel. */
export function createConversationTools(
	params: Omit<IntegrationActionToolParams, 'descriptor'> & {
		descriptors: IntegrationActionToolParams['descriptor'][];
	},
) {
	return CONVERSATION_TOOL_NAMES.flatMap((name) => {
		const supported = params.descriptors.filter((descriptor) =>
			descriptor.conversationTools?.includes(name),
		);
		if (supported.length === 0) return [];
		return [
			new Tool(name)
				.description(
					'End this turn without replying to the current conversation. Call this when a subscribed channel or thread message needs no reply from you. Do not write any text before or after the call. Do not announce that you are staying silent. Direct messages and direct mentions require a reply.',
				)
				.input(doNotRespondSchema)
				.providerOptions({ anthropic: { deferLoading: false }, openai: { deferLoading: false } })
				.suspend(INTEGRATION_ACTION_SUSPEND_SCHEMA)
				.resume(INTEGRATION_ACTION_RESUME_SCHEMA)
				.endsTurnWhen(isSilentActionOutput)
				.handler(async (input, ctx) => {
					const context = readIntegrationMessageContext(ctx.persistence);
					const descriptor = supported.find(
						(candidate) => candidate.integrationConnectionId === context?.integrationConnectionId,
					);
					if (!descriptor) {
						return {
							ok: false,
							error: {
								code: INTEGRATION_ERROR_CODES.NO_MESSAGE_CONTEXT_FOR_INTEGRATION,
								message: `The current conversation does not support ${name}.`,
							},
						};
					}
					return await executeIntegrationActionTool(
						{ ...params, descriptor },
						{ action: name, input },
						ctx,
					);
				}),
		];
	});
}
