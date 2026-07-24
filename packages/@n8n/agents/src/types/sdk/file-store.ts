import type { ContentFileRef } from './message';

/**
 * Host-injected store that resolves `ContentFileRef` references to bytes.
 *
 * File content parts are persisted by reference only; before each LLM call
 * the runtime hydrates supported parts through this store (see
 * `hydrateFileParts`). Parts left without `data` — unsupported media type,
 * unknown reference, or load failure — are presented to the model as a text
 * metadata line instead of a file part.
 */
export interface BuiltFileStore {
	/** Resolve a file reference to its bytes. Returns `null` when the file is unknown or deleted. */
	load(ref: ContentFileRef): Promise<Uint8Array | null>;

	/**
	 * Whether the current model accepts this media type as a file part.
	 * When omitted, every media type is hydrated.
	 */
	isMediaTypeSupported?(mediaType: string | undefined): boolean;
}
