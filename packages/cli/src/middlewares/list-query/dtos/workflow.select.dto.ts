import { BaseSelect } from './base.select.dto.js';

export class WorkflowSelect extends BaseSelect {
	static get selectableFields() {
		return new Set([
			'id', // always included downstream
			'name',
			'active',
			'activeVersionId',
			'tags',
			'createdAt',
			'updatedAt',
			'versionId',
			'ownedBy', // non-entity field
			'parentFolder',
			'nodes',
			'isArchived',
			'description',
		]);
	}

	static fromString(rawFilter: string) {
		return this.toSelect(rawFilter, WorkflowSelect);
	}
}
