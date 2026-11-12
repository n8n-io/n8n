import { InstanceAiSendMessageRequest } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { toJsonValue } from '@n8n/utils/json/to-json-value';
import { isRecord } from '@n8n/utils/is-record';
import { nanoid } from 'nanoid';

/** Id of the n8n Assistant instance agent in the Agents tables. */
export const ASSISTANT_AGENT_ID = 'assistant';

export const ASSISTANT_AGENT_NAME = 'Assistant';

/** Checkpoint host metadata key that carries the turn options to a resume. */
export const ASSISTANT_TURN_METADATA_KEY = 'assistantTurn';

/** What the client sent with the message, except the message text and the files. */
export type AssistantClientRequest = Omit<InstanceAiSendMessageRequest, 'message'>;

/**
 * What one Assistant turn needs besides the message. The queue stores these
 * options with the message, and the checkpoint stores them for a resume, so
 * any main can run the turn.
 */
export interface AssistantTurnOptions {
	/** Run id of the turn. A resume keeps the run id of its suspended turn. */
	runId: string;
	messageGroupId: string;
	request: AssistantClientRequest;
}

/**
 * Parse the client context of a chat message. Files travel through the Agents
 * attachment store, so the options keep only the resource references.
 */
function parseClientRequest(value: unknown, logger?: Logger): AssistantClientRequest {
	const parsed = InstanceAiSendMessageRequest.safeParse({
		...(isRecord(value) ? value : {}),
		message: '',
	});
	if (!parsed.success) {
		// Log only the field paths: the values can hold user content.
		logger?.warn('Dropped the Assistant client context because it is not valid', {
			fields: parsed.error.issues.map((issue) => issue.path.join('.')),
		});
		return {};
	}
	const { message: _message, attachments, ...request } = parsed.data;
	const references = attachments?.filter((attachment) => attachment.type !== 'file');
	return { ...request, ...(references?.length ? { attachments: references } : {}) };
}

/** The options of a new turn from the client context of a chat message. */
export function createAssistantTurnOptions(
	clientContext: unknown,
	logger?: Logger,
): AssistantTurnOptions {
	return {
		runId: `run_${nanoid()}`,
		messageGroupId: `mg_${nanoid()}`,
		request: parseClientRequest(clientContext, logger),
	};
}

/** Read stored turn options. Missing or invalid options get new ids and no client context. */
export function readAssistantTurnOptions(value: unknown, logger?: Logger): AssistantTurnOptions {
	if (!isRecord(value)) return createAssistantTurnOptions(undefined);
	const created = createAssistantTurnOptions(value.request, logger);
	return {
		runId: typeof value.runId === 'string' && value.runId ? value.runId : created.runId,
		messageGroupId:
			typeof value.messageGroupId === 'string' && value.messageGroupId
				? value.messageGroupId
				: created.messageGroupId,
		request: created.request,
	};
}

/** The JSON form that the queue and the checkpoint store. */
export function serializeAssistantTurnOptions(options: AssistantTurnOptions) {
	return {
		runId: options.runId,
		messageGroupId: options.messageGroupId,
		request: toJsonValue(options.request),
	};
}
