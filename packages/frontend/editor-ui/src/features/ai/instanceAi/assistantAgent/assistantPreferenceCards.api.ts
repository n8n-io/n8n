import type {
	AiPreferenceScope,
	AssistantPreferenceCardEditResponse,
	AssistantPreferenceCardsResponse,
	AssistantPreferenceCardUndoResponse,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

/** The preference cards of an Assistant agent thread that the user edited or undid. */
export async function fetchAssistantPreferenceCards(
	context: IRestApiContext,
	threadId: string,
): Promise<AssistantPreferenceCardsResponse> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/assistant/threads/${threadId}/preference-cards`,
	);
}

/** Deletes the preference that a `save_user_preference` call saved, and stores the undone card. */
export async function undoAssistantPreferenceCard(
	context: IRestApiContext,
	threadId: string,
	preferenceId: string,
	body: { toolCallId: string },
): Promise<AssistantPreferenceCardUndoResponse> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/assistant/threads/${threadId}/preferences/${preferenceId}/undo`,
		body,
	);
}

/** Updates the preference that a `save_user_preference` call saved, and stores the edited card. */
export async function editAssistantPreferenceCard(
	context: IRestApiContext,
	threadId: string,
	preferenceId: string,
	body: {
		toolCallId: string;
		content: string;
		/** Absent on a text-only edit, which leaves the row in the scope it holds now. */
		scope?: AiPreferenceScope;
		projectId?: string | null;
		userId?: string | null;
	},
): Promise<AssistantPreferenceCardEditResponse> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/assistant/threads/${threadId}/preferences/${preferenceId}/edit`,
		body,
	);
}
