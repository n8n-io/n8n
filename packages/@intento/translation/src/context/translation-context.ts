import { IContext, mapTo } from 'intento-core';
import { INodeProperties } from 'n8n-workflow';

import { TranslationRequest } from 'supply/translation-request';

const TRANSLATION = {
	KEYS: {
		FROM: 'translation_context_from',
		TO: 'translation_context_to',
		TEXT: 'translation_context_text',
	},
	DEFAULTS: {
		TO: 'en',
	},
};

/**
 * Translation context extracted from n8n node parameters.
 *
 * Uses @mapTo decorators to bind constructor parameters to n8n node properties.
 * Immutable value object that validates required fields and converts to TranslationRequest.
 */
export class TranslationContext implements IContext {
	/** Source language code - optional, defaults to auto-detection */
	readonly from?: string;
	/** Target language code - required */
	readonly to: string;
	/** Text content to translate */
	readonly text: string;

	/**
	 * Creates translation context from n8n node parameters.
	 *
	 * NOTE: @mapTo decorators execute bottom-to-top, binding parameters to n8n properties.
	 *
	 * @param text - Content to translate, mapped from TRANSLATION.KEYS.TEXT
	 * @param to - Target language, mapped from TRANSLATION.KEYS.TO
	 * @param from - Source language (optional), mapped from TRANSLATION.KEYS.FROM
	 */
	constructor(
		@mapTo(TRANSLATION.KEYS.TEXT) text: string,
		@mapTo(TRANSLATION.KEYS.TO) to: string,
		@mapTo(TRANSLATION.KEYS.FROM) from?: string,
	) {
		this.from = from;
		this.to = to;
		this.text = text;
		Object.freeze(this);
	}

	/**
	 * Validates required target language is present.
	 *
	 * @throws Error if target language is missing or empty after trimming
	 */
	throwIfInvalid(): void {
		if (this.to === undefined || this.to.trim() === '') throw new Error('"to" language must be specified.');
	}

	asLogMetadata(): Record<string, unknown> {
		return {
			from: this.from,
			to: this.to,
		};
	}

	/**
	 * Converts context to immutable translation request.
	 *
	 * @returns TranslationRequest ready for supplier execution
	 */
	toRequest(): TranslationRequest {
		return new TranslationRequest(this.text, this.to, this.from);
	}
}

/**
 * n8n node properties for translation context.
 *
 * Defines UI form fields for translation parameters in n8n workflow editor.
 * Property names must match TRANSLATION.KEYS for @mapTo decorator binding.
 */
export const CONTEXT_TRANSLATION = [
	{
		displayName: 'From Language',
		name: TRANSLATION.KEYS.FROM,
		type: 'string',
		default: '',
		placeholder: 'auto (detect)',
		description: 'The language code of the source text. Defaults to auto-detection if not specified.',
	},
	{
		displayName: 'To Language',
		name: TRANSLATION.KEYS.TO,
		type: 'string',
		default: TRANSLATION.DEFAULTS.TO,
		placeholder: 'en',
		description: 'The language code to translate the text into.',
		required: true,
	},
	{
		displayName: 'Text',
		name: TRANSLATION.KEYS.TEXT,
		type: 'string',
		default: '',
		placeholder: 'Hello, world!',
		description: 'The text to be translated.',
	},
] as INodeProperties[];
