import { IContext, mapTo, Text } from 'intento-core';
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

export class TranslationContext implements IContext {
	readonly from?: string;
	readonly to: string;
	readonly text: Text;

	constructor(
		@mapTo(TRANSLATION.KEYS.TEXT) text: Text,
		@mapTo(TRANSLATION.KEYS.TO) to: string,
		@mapTo(TRANSLATION.KEYS.FROM) from?: string,
	) {
		this.from = from;
		this.to = to;
		this.text = text;
		Object.freeze(this);
	}

	throwIfInvalid(): void {
		if (this.to === undefined || this.to.trim() === '') throw new Error('"to" language must be specified.');
	}

	asLogMetadata(): Record<string, unknown> {
		return {
			from: this.from,
			to: this.to,
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
	},
] as INodeProperties[];
