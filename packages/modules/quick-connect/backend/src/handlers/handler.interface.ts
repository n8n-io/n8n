import type { Person } from '@n8n/db';

import type { QuickConnectOption } from '../quick-connect.config';

/**
 * Interface for quick connect handlers.
 * Handlers can be frontend-based or backend-based.
 */
export interface IQuickConnectHandler<ConfigOption = QuickConnectOption> {
	/**
	 * Sets provider configuration
	 * @param config - Configured quick connect option
	 */
	setConfig(config: ConfigOption): void;
	/**
	 * Fetches api key from the third-party service.
	 * Used only for backend-based Quick connect flows.
	 * @param person - The person requesting the credential. The third party knows them by email.
	 * @returns The credential data
	 */
	getCredentialData(person: Person): Promise<{ apiKey: string }>;
}

export type IQuickConnectHandlerOption<Handler> = Handler extends IQuickConnectHandler<infer Option>
	? Option
	: never;
