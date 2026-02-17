import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import type { QuickConnectBackendOption } from '../quick-connect.config';

/**
 * Interface for quick connect handlers.
 * Handlers can be frontend-based or backend-based.
 */
export interface IQuickConnectHandler {
	/**
	 * The credential type this handler supports.
	 */
	readonly credentialType: string;

	/**
	 * Fetches credential data from the third-party service.
	 * Used only for backend-based Quick connect flows.
	 * @param config - Configuration for this particular Quick connect option
	 * @param user - The user requesting the credential
	 * @returns The credential data to be saved
	 */
	getCredentialData?(
		config: QuickConnectBackendOption,
		user: User,
	): Promise<ICredentialDataDecryptedObject>;
}

/**
 * Registry for quick connect handlers.
 * Handlers are registered here and can be looked up by credential type.
 */
@Service()
export class QuickConnectHandlerRegistry {
	private readonly handlers = new Map<string, IQuickConnectHandler>();

	register(handler: IQuickConnectHandler): void {
		this.handlers.set(handler.credentialType, handler);
	}

	get(credentialType: string): IQuickConnectHandler | undefined {
		return this.handlers.get(credentialType);
	}
}
