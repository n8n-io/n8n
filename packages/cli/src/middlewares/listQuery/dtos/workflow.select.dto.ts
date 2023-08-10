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

	static validate(dto: string[]) {
		return dto.filter((key) => this.selectableFields.has(key));
	}
}
