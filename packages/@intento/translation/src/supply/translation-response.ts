import { SupplyResponseBase } from 'intento-core';
import type { LogMetadata, IDataObject } from 'n8n-workflow';

import type { TranslationRequest } from 'supply/translation-request';

/**
 * Represents a successful translation response.
 *
 * Immutable value object containing original request context plus translation result.
 * Includes detected language when source language was auto-detected.
 */
export class TranslationResponse extends SupplyResponseBase {
	/** Source language from request, may be undefined if auto-detected */
	readonly from?: string;
	/** Target language from request */
	readonly to: string;
	/** Original text that was translated */
	readonly text: string;
	/** Translated text result */
	readonly translation: string;
	/** Auto-detected source language, set only when from was undefined in request */
	readonly detectedLanguage?: string;

	/**
	 * Creates a translation response from request and result.
	 *
	 * @param request - Original translation request containing source context
	 * @param translation - Translated text result
	 * @param detectedLanguage - Detected source language (relevant only when request.from was undefined)
	 */
	constructor(request: TranslationRequest, translation: string, detectedLanguage?: string) {
		super(request);
		this.from = request.from;
		this.to = request.to;
		this.text = request.text;
		this.translation = translation;
		this.detectedLanguage = detectedLanguage;
	}

	/**
	 * Converts response to structured log metadata format.
	 *
	 * @returns Metadata object for structured logging, excluding text/translation to prevent log bloat
	 */
	asLogMetadata(): LogMetadata {
		return {
			requestId: this.requestId,
			from: this.from,
			to: this.to,
			detectedLanguage: this.detectedLanguage,
			latencyMs: this.latencyMs,
		};
	}

	asDataObject(): IDataObject {
		return {
			from: this.from,
			to: this.to,
			text: this.text,
			translation: this.translation,
			detectedLanguage: this.detectedLanguage,
			latencyMs: this.latencyMs,
		};
	}
}
