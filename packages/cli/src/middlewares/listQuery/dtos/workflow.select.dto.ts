import { isStringArray } from '@/utils';

export class WorkflowSelect {
	fields: string[];

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
		]);
	}

	constructor(dto: unknown) {
		if (!isStringArray(dto)) throw new Error('Parsed select is not a string array');

		this.fields = dto.filter((key) => WorkflowSelect.selectableFields.has(key));
	}

	validate() {
		return this.fields.reduce<Record<string, true>>((acc, field) => {
			return (acc[field] = true), acc;
		}, {});
	}
}
