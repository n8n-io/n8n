import { SupplyRequestBase } from 'intento-core';
import type { LogMetadata, INodeExecutionData } from 'n8n-workflow';

/**
 * Represents a translation request with source text and target language.
 *
 * Immutable value object that encapsulates all parameters needed for translation.
 * Validates required fields on construction and freezes instance to prevent modification.
 */
export class TranslationRequest extends SupplyRequestBase {
	/** Text content to be translated */
	readonly text: string;
	/** Target language code (e.g., 'en', 'es', 'fr') - required */
	readonly to: string;
	/** Source language code - optional, defaults to auto-detection */
	readonly from?: string;

	/**
	 * Creates a new translation request.
	 *
	 * @param text - Content to translate (can be empty string but not null/undefined)
	 * @param to - Target language code, must be non-empty after trimming
	 * @param from - Source language code, optional for auto-detection
	 * @throws Error if target language is empty or missing
	 */
	constructor(text: string, to: string, from?: string) {
		super();
		this.text = text;
		this.to = to;
		this.from = from;

		this.throwIfInvalid();
		Object.freeze(this);
	}

	/**
	 * Validates request has required target language.
	 *
	 * NOTE: Called automatically during construction to fail fast on invalid requests.
	 *
	 * @throws Error if target language is missing or empty after trimming
	 */
	protected throwIfInvalid(): void {
		if (!this.to || this.to.trim() === '') throw new Error('targetLanguage is required');
	}

	/**
	 * Converts request to structured log metadata format.
	 *
	 * @returns Metadata object for structured logging, excluding text content to prevent log bloat
	 */
	asLogMetadata(): LogMetadata {
		return {
			requestId: this.requestId,
			from: this.from,
			to: this.to,
			requestedAt: this.requestedAt,
		};
	}
	asExecutionData(): INodeExecutionData[][] {
		return [
			[
				{
					json: {
						requestId: this.requestId,
						from: this.from,
						to: this.to,
						text: this.text,
						requestedAt: this.requestedAt,
					},
				},
			],
		];
	}

	/**
	 * Creates a shallow clone of this request.
	 *
	 * @returns New request instance with identical field values
	 */
	clone(): this {
		return new TranslationRequest(this.text, this.to, this.from) as this;
	}
}
