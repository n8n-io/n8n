import { BaseSelect } from './base.select.dto';

export class CredentialsSelect extends BaseSelect {
	static get selectableFields() {
		return new Set([
			'id', // always included downstream
			'name',
			'type',
		]);
	}

	static fromString(rawFilter: string) {
		return this.toSelect(rawFilter, CredentialsSelect);
	}
}
