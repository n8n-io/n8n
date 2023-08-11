import { isStringArray } from '@/utils';

export class WorkflowSelectDtoValidator {
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

	static validate(dto: unknown) {
		if (!isStringArray(dto)) throw new Error('Parsed select is not a string array');

		return dto.filter((key) => this.selectableFields.has(key));
	}
}
