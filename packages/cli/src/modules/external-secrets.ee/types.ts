import type { AuthenticatedRequest } from '@n8n/db';
import type { IDataObject, INodeProperties } from 'n8n-workflow';

export interface SecretsProviderSettings<T = IDataObject> {
	connected: boolean;
	connectedAt: Date | null;
	settings: T;
}

export interface ExternalSecretsSettings {
	[key: string]: SecretsProviderSettings;
}

export type SecretsProviderState =
	| 'initializing'
	| 'initialized'
	| 'connecting'
	| 'connected'
	| 'error'
	| 'retrying';

interface StateTransition {
	from: SecretsProviderState;
	to: SecretsProviderState;
	at: Date;
	error?: Error;
}

export abstract class SecretsProvider {
	abstract displayName: string;

	abstract name: string;

	abstract properties: INodeProperties[];

	abstract init(settings: SecretsProviderSettings): Promise<void>;
	abstract disconnect(): Promise<void>;
	abstract update(): Promise<void>;
	abstract test(): Promise<[boolean] | [boolean, string]>;
	abstract getSecret(name: string): unknown;
	abstract hasSecret(name: string): boolean;
	abstract getSecretNames(): string[];

	state: SecretsProviderState = 'initializing';

	protected stateHistory: StateTransition[] = [];

	/**
	 * Template method for connecting - manages state transitions
	 * Subclasses implement doConnect() with their connection logic
	 */
	async connect(): Promise<void> {
		this.setState('connecting');

		try {
			await this.doConnect();
			this.setState('connected');
		} catch (error) {
			const typedError = error instanceof Error ? error : new Error(String(error));
			this.setState('error', typedError);
			// Don't rethrow - state tells the story
		}
	}

	/**
	 * Subclasses implement this with their actual connection logic
	 * Should throw on error - base class handles state management
	 */
	protected abstract doConnect(): Promise<void>;

	/**
	 * Transitions to a new state with logging and history tracking
	 * Public so that manager can update state (for 'retrying')
	 */
	setState(newState: SecretsProviderState, error?: Error): void {
		const oldState = this.state;
		if (oldState === newState) return;

		this.stateHistory.push({
			from: oldState,
			to: newState,
			at: new Date(),
			error,
		});

		this.state = newState;
	}

	/**
	 * Check if this provider has ever been successfully connected
	 */
	get hasEverBeenConnected(): boolean {
		return this.stateHistory.some((t) => t.to === 'connected');
	}

	/**
	 * Check if operations requiring connection can be performed
	 */
	get canPerformOperations(): boolean {
		return this.state === 'connected';
	}
}

export declare namespace ExternalSecretsRequest {
	type GetProviderResponse = Pick<SecretsProvider, 'displayName' | 'name' | 'properties'> & {
		icon: string;
		connected: boolean;
		connectedAt: Date | null;
		state: SecretsProviderState;
		data: IDataObject;
	};

	type GetProviders = AuthenticatedRequest;
	type GetProvider = AuthenticatedRequest<{ provider: string }, GetProviderResponse>;
	type SetProviderSettings = AuthenticatedRequest<{ provider: string }, {}, IDataObject>;
	type TestProviderSettings = SetProviderSettings;
	type SetProviderConnected = AuthenticatedRequest<
		{ provider: string },
		{},
		{ connected: boolean }
	>;

	type UpdateProvider = AuthenticatedRequest<{ provider: string }>;
}
