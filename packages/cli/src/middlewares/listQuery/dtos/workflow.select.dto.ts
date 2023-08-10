import { isSharingEnabled } from '@/UserManagement/UserManagementHelper';

export class WorkflowSelectDtoValidator {
	static get selectableFields() {
		return [
			'id', // always included downstream
			'name',
			'active',
			'tags',
			'createdAt',
			'updatedAt',
		];
	}

	static validate(dto: string[]) {
		const { selectableFields } = WorkflowSelectDtoValidator;

		if (isSharingEnabled()) {
			selectableFields.push('versionId');
			selectableFields.push('ownedBy'); // non-entity field
		}

		return dto.filter((key) => selectableFields.includes(key));
	}
}
