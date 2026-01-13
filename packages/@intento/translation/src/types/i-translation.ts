import type { ISegment } from 'intento-segmentation';

/**
 * Translation result combining segment data with detected source language.
 *
 * Extends ISegment to include language detection metadata for translation operations.
 */
export interface ITranslation extends ISegment {
	/** ISO 639-1 language code detected by translation provider (e.g., 'en', 'es', 'fr') */
	readonly detectedLanguage: string;
}
