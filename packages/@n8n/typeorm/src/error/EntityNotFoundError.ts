import { EntityTarget } from '../common/EntityTarget';
import { TypeORMError } from './TypeORMError';
import { ObjectUtils } from '../util/ObjectUtils';
import { InstanceChecker } from '../util/InstanceChecker';

/**
 * Thrown when no result could be found in methods which are not allowed to return undefined or an empty set.
 */
export class EntityNotFoundError extends TypeORMError {
	public readonly entityClass: EntityTarget<any>;
	public readonly criteria: any;

	constructor(entityClass: EntityTarget<any>, criteria: any) {
		super();

		this.entityClass = entityClass;
		this.criteria = criteria;

		this.message =
			`Could not find any entity of type "${this.stringifyTarget(entityClass)}" ` +
			`matching: ${this.stringifyCriteria(criteria)}`;
	}

	private stringifyTarget(target: EntityTarget<any>): string {
		if (InstanceChecker.isEntitySchema(target)) {
			return target.options.name;
		} else if (typeof target === 'function') {
			return target.name;
		} else if (ObjectUtils.isObject(target) && 'name' in (target as any)) {
			return (target as any).name;
		} else {
			return target as any;
		}
	}

	private stringifyCriteria(criteria: any): string {
		try {
			return JSON.stringify(criteria, null, 4);
		} catch (e) {}
		return '' + criteria;
	}
}
