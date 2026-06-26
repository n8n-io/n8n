import { TypeORMError } from './TypeORMError';

/**
 * Thrown when some option is not set in the connection options.
 */
export class NoConnectionOptionError extends TypeORMError {
	constructor(optionName: string) {
		super(
			`Option "${optionName}" is not set in your connection options, please ` +
				`define "${optionName}" option in your connection options or ormconfig.json`,
		);
	}
}
