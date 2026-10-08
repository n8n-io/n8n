import { z } from 'zod';

/** A chat request that the server refused with an HTTP error, before any stream opened. */
export interface ChatRejection {
	status: number;
	/** The server's message, written for the user. */
	message?: string;
	/** On a 409 for a card answer: the name of the user who answered the card first. */
	answeredBy?: string;
}

/**
 * A card answer (resume) that did not go through. `status` is set when the server refused the
 * request with an HTTP error. Without it, the stream reported an error after it opened, for
 * example when another answer to the same card won the race.
 */
export interface AgentResumeFailure extends Partial<ChatRejection> {
	toolCallId: string;
}

const optionalText = z.string().trim().min(1).optional().catch(undefined);

// n8n REST errors are `{ code, message, hint?, meta? }`. Each field is read on its own, so
// one field in an unknown shape does not hide the others.
const rejectionBodySchema = z
	.object({
		message: optionalText,
		meta: z
			.object({
				answeredBy: z.object({ name: optionalText }).optional().catch(undefined),
			})
			.optional()
			.catch(undefined),
	})
	.catch({});

async function readJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		// An empty or non-JSON body has nothing to read.
		return undefined;
	}
}

/** Reads the error body of a refused chat request. Never throws. */
export async function readChatRejection(response: Response): Promise<ChatRejection> {
	const body = rejectionBodySchema.parse(await readJson(response));
	const answeredBy = body.meta?.answeredBy?.name;
	return {
		status: response.status,
		...(body.message !== undefined && { message: body.message }),
		...(answeredBy !== undefined && { answeredBy }),
	};
}
