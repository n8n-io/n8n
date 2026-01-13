import { IContext, mapTo } from 'intento-core';
import { INodeProperties } from 'n8n-workflow';

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
 * Translation request context with source/target languages and text to translate.
 *
 * Immutable after construction (Object.freeze). Must call throwIfInvalid() before use.
 */
export class TranslationContext implements IContext {
	readonly from?: string;
	readonly to: string;
	readonly text: string[];

	/**
	 * Creates translation context for agent execution.
	 *
	 * @param text - Single string or array of strings to translate (normalized to array internally)
	 * @param to - Target language code (ISO 639-1/BCP-47, e.g., "en", "en-US")
	 * @param from - Source language code (undefined triggers auto-detection)
	 */
	constructor(
		@mapTo(TRANSLATION.KEYS.TEXT) text: string | string[],
		@mapTo(TRANSLATION.KEYS.TO) to: string,
		@mapTo(TRANSLATION.KEYS.FROM) from?: string,
	) {
		this.from = from;
		this.to = to;
		// NOTE: Normalize Text union type to array for consistent downstream processing
		this.text = Array.isArray(text) ? text : [text];
		Object.freeze(this);
	}

	throwIfInvalid(): void {
		const wrongText = this.text.filter((t) => t === null || t === undefined);
		if (wrongText.length > 0) throw new Error('"text" contains null or undefined values.');
		if (this.to === undefined || this.to.trim() === '') throw new Error('"to" language must be specified.');
		if (this.text.length === 0) throw new Error('"text" must contain at least one string to translate.');
	}

	asLogMetadata(): Record<string, unknown> {
		return {
			from: this.from,
			to: this.to,
			// NOTE: Log count not content to avoid PII in logs
			textCount: this.text.length,
		};
	}
}

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
		required: true,
	},
] as INodeProperties[];
