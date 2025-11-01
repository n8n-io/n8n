export const CURRENT_VERSION = '2010-05-08';
export const BASE_URL = 'https://iam.amazonaws.com';
export const ERROR_DESCRIPTIONS = {
	EntityAlreadyExists: {
		User: 'The given user name already exists - try entering a unique name for the user.',
		Group: 'The given group name already exists - try entering a unique name for the group.',
	},
	NoSuchEntity: {
		User: 'The given user was not found - try entering a different user.',
		Group: 'The given group was not found - try entering a different group.',
	},
	DeleteConflict: {
		Default: 'Cannot delete entity, please remove users from group first.',
	},
};
