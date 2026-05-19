import { TypeORMError } from './TypeORMError';

/**
 * Thrown when required driver's package is not installed.
 */
export class DriverPackageNotInstalledError extends TypeORMError {
	constructor(driverName: string, packageName: string) {
		super(
			`${driverName} package has not been found installed. ` +
				`Try to install it: npm install ${packageName} --save`,
		);
	}
}
