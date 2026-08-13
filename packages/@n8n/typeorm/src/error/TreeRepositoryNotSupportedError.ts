import { Driver } from '../driver/Driver';
import { TypeORMError } from './TypeORMError';

export class TreeRepositoryNotSupportedError extends TypeORMError {
	constructor(driver: Driver) {
		super(`Tree repositories are not supported in ${driver.options.type} driver.`);
	}
}
