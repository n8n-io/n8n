import type { User } from '@n8n/db';

/**
 * The CLI implements this port with the model of the n8n Assistant, for the person who asks
 * for the draft.
 */

/**
 * `not_available`: the Assistant is off, has no model, or the person cannot use it.
 * `no_credits`: the person has no Assistant credits left, so n8n made no model call.
 */
export type TextDraftResult =
	| { status: 'drafted'; text: string }
	| { status: 'not_available' }
	| { status: 'no_credits' };

export abstract class TextDraftPort {
	/** Whether the Assistant can write drafts for this person. It makes no model call. */
	abstract isAvailable(user: User): Promise<boolean>;

	/** One model call with the prompt. A failed call throws. */
	abstract draft(user: User, prompt: string): Promise<TextDraftResult>;
}
