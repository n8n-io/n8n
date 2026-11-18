/** An agent as core sees it: its id and name. */
export type ServiceAccountAgent = { id: string; name: string };

/**
 * What core needs to know about the agent that acts as a service account. The
 * agents module implements it and registers it on `ServiceAccountUsageProxy` on
 * init, so core never imports the agents module.
 */
export abstract class ServiceAccountUsage {
	/** The agent that acts as the service account, or `null` when no agent does. */
	abstract findAgent(serviceAccountId: string): Promise<ServiceAccountAgent | null>;
}
