import type { User } from '@n8n/db';

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
	 * @param user - The user requesting the credential
	 * @returns The credential data
	 */
	getCredentialData(user: User): Promise<{ apiKey: string }>;
}

export type IQuickConnectHandlerOption<Handler> = Handler extends IQuickConnectHandler<infer Option>
	? Option
	: never;
