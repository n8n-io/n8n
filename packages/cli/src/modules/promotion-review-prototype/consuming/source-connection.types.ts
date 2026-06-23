/** A configured producing instance the consuming side can pull promotions from. */
export interface SourceConnection {
	id: string;
	name: string;
	/** Origin of the producing instance, e.g. `http://localhost:5679`. */
	baseUrl: string;
	createdAt: string;
}

/** A source connection with its decrypted API key — never leaves the backend. */
export interface ResolvedSourceConnection extends SourceConnection {
	apiKey: string;
}

/** Persisted form: API key is encrypted at rest via {@link Cipher}. */
export interface StoredSourceConnection extends SourceConnection {
	encryptedApiKey: string;
}
