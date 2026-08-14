import { EntityMetadata } from '../metadata/EntityMetadata';
import { ObjectUtils } from '../util/ObjectUtils';
import { TypeORMError } from '../error';

/**
 */
export class Alias {
	type: 'from' | 'select' | 'join' | 'other'; // todo: make something with "other"

	name: string;

	/**
	 * Table on which this alias is applied.
	 * Used only for aliases which select custom tables.
	 */
	tablePath?: string;

	/**
	 * If this alias is for sub query.
	 */
	subQuery?: string;

	constructor(alias?: Alias) {
		ObjectUtils.assign(this, alias || {});
	}

	private _metadata?: EntityMetadata;

	get target(): Function | string {
		return this.metadata.target;
	}

	get hasMetadata(): boolean {
		return !!this._metadata;
	}

	set metadata(metadata: EntityMetadata) {
		this._metadata = metadata;
	}

	get metadata(): EntityMetadata {
		if (!this._metadata)
			throw new TypeORMError(`Cannot get entity metadata for the given alias "${this.name}"`);

		return this._metadata;
	}
}
