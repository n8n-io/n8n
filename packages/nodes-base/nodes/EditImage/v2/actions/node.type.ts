export type EditImageOperation =
	| 'blur'
	| 'border'
	| 'composite'
	| 'create'
	| 'crop'
	| 'draw'
	| 'information'
	| 'multiStep'
	| 'resize'
	| 'rotate'
	| 'shear'
	| 'text'
	| 'transparent';

export function isEditImageOperation(value: string): value is EditImageOperation {
	return (
		value === 'blur' ||
		value === 'border' ||
		value === 'composite' ||
		value === 'create' ||
		value === 'crop' ||
		value === 'draw' ||
		value === 'information' ||
		value === 'multiStep' ||
		value === 'resize' ||
		value === 'rotate' ||
		value === 'shear' ||
		value === 'text' ||
		value === 'transparent'
	);
}
