/**
 * Options accepted by {@link pull}.
 */
export interface PullOptions {
	/** Base URL of the n8n Hub instance to pull the catalog from. */
	baseUrl: string;
	/** Bearer token used to authenticate against the Hub. */
	token: string;
	/** Destination directory for the generated SDK artifacts. */
	outDir?: string;
}

/**
 * Pulls the latest nodes catalog from the Hub and regenerates the typed
 * SDK surface on disk.
 *
 * This is a scaffolding stub. The real implementation lands in Phase 4.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function pull(_options: PullOptions): Promise<void> {
	throw new Error('not implemented');
}
