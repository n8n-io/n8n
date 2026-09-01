/**
 * Read-only credential-readiness signal for the in-widget status strip.
 * Populated only when a host page (the hosted chat shell) posts it in via
 * `postMessage` - see `@n8n/chat/utils/credentialStatus`. The widget never
 * mutates this itself and holds no credential logic of its own.
 */
export interface CredentialStatus {
	/** Whether all required end-user credentials are connected. */
	ready: boolean;
	/** How many required accounts are still not connected. */
	missingCount: number;
	/**
	 * True during a test-mode execution, where identity was established using
	 * the builder's own already-connected credentials rather than a visitor's.
	 */
	testMode: boolean;
}
