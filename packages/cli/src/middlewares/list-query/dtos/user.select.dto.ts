import { BaseSelect } from './base.select.dto';

export class UserSelect extends BaseSelect {
	static get selectableFields() {
		return new Set(['id', 'email', 'firstName', 'lastName']);
	}

	static fromString(rawFilter: string) {
		return this.toSelect(rawFilter, UserSelect);
	}
}
