import { BaseSelect } from './base.select.dto';

export class WorkflowSelect extends BaseSelect {
	static get selectableFields() {
		return new Set([
			'id', // always included downstream
			'name',
			'active',
			'tags',
			'createdAt',
			'updatedAt',
			'versionId',
			'ownedBy', // non-entity field
			'parentFolder',
		]);
	}

	static fromString(rawFilter: string) {
		return this.toSelect(rawFilter, WorkflowSelect);
	}
}
