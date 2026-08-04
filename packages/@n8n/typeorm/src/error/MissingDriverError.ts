import { TypeORMError } from './TypeORMError';

/**
 * Thrown when consumer specifies driver type that does not exist or supported.
 */
export class MissingDriverError extends TypeORMError {
	constructor(driverType: string, availableDrivers: string[] = []) {
		super(
			`Wrong driver: "${driverType}" given. Supported drivers are: ` +
				`${availableDrivers.map((d) => `"${d}"`).join(', ')}.`,
		);
	}
}
