import { isSharingEnabled } from '@/UserManagement/UserManagementHelper';

export class WorkflowSelectDtoValidator {
	static get selectableFields() {
		return [
			'id', // inclusion by caller is allowed but has no effect, always included downstream
			'name',
			'active',
			'tags',
			'versionId',
			'createdAt',
			'updatedAt',
		];
	}

	static validate(dto: string[]) {
		const { selectableFields } = WorkflowSelectDtoValidator;

		if (isSharingEnabled()) {
			selectableFields.push('ownedBy'); // non-entity field, only supported on EE
		}

		return dto.filter((key) => selectableFields.includes(key));
	}
}
