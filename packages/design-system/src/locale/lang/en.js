export default {
	'nds.auth.roles.owner': 'Owner',
	'nds.userInfo.you': '(you)',
	'nds.userSelect.selectUser': 'Select User',
	'nds.userSelect.noMatchingUsers': 'No matching users',
	'nds.usersList.deleteUser': 'Delete User',
	'nds.usersList.reinviteUser': 'Resend invite',
	'formInput.validator.fieldRequired': 'This field is required',
	'formInput.validator.minCharactersRequired': 'Must be at least {minimum} characters',
	'formInput.validator.maxCharactersRequired': 'Must be at most {maximum} characters',
	'formInput.validator.oneNumbersRequired': (config) => {
		return `Must have at least ${config.minimum} number${config.minimum > 1 ? 's' : ''}`;
	},
	'formInput.validator.validEmailRequired': 'Must be a valid email',
	'formInput.validator.uppercaseCharsRequired': (config) => (`Must have at least ${config.minimum} uppercase character${
		config.minimum > 1 ? 's' : ''
	}`),
	"formInput.validator.defaultPasswordRequirements": "8+ characters, at least 1 number and 1 capital letter",
};
