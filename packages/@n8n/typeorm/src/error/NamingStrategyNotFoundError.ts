import { TypeORMError } from './TypeORMError';

/**
 * Thrown when consumer tries to use naming strategy that does not exist.
 */
export class NamingStrategyNotFoundError extends TypeORMError {
	constructor(strategyName: string | Function, connectionName: string) {
		super();

		const name = typeof strategyName === 'function' ? (strategyName as any).name : strategyName;
		this.message =
			`Naming strategy "${name}" was not found. Looks like this naming strategy does not ` +
			`exist or it was not registered in current "${connectionName}" connection?`;
	}
}
