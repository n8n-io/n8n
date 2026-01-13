import type { IDescriptor } from 'intento-core';

/**
 * Translation provider descriptor with batching limits and language mapping.
 *
 * Extends IDescriptor with translation-specific configuration for batch processing,
 * segment sizing, and bidirectional language code normalization.
 */
export interface ITranslationDescriptor extends IDescriptor {
	/** Optional credential reference for authenticated translation providers */
	credentials?: string;

	/** Maximum number of segments that can be translated in a single batch request */
	batchLimit: number;

	/** Maximum characters per segment to prevent provider limits and timeouts */
	segmentLimit: number;

	/** Bidirectional language code mapping (n8n ↔ provider-specific codes) */
	languageMap: {
		/** Map n8n language codes to provider-specific codes for source language */
		from: Map<string, string>;
		/** Map n8n language codes to provider-specific codes for target language */
		to: Map<string, string>;
	};

	/** Sets of supported language codes for validation and UI filtering */
	knownLanguages: {
		/** Source languages supported by this provider */
		from: Set<string>;
		/** Target languages supported by this provider */
		to: Set<string>;
	};
}
