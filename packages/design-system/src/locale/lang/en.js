export default {
	'nds.auth.roles.owner': 'Owner',
	'nds.userInfo.you': '(you)',
	'nds.userSelect.selectUser': 'Select User',
	'nds.userSelect.noMatchingUsers': 'No matching users',
	'notice.showMore': 'Show more',
	'notice.showLess': 'Show less',
	'formInput.validator.fieldRequired': 'This field is required',
	'formInput.validator.minCharactersRequired': 'Must be at least {minimum} characters',
	'formInput.validator.maxCharactersRequired': 'Must be at most {maximum} characters',
	'formInput.validator.oneNumbersRequired': (config) => {
		return `Must have at least ${config.minimum} number${config.minimum > 1 ? 's' : ''}`;
	},
	'formInput.validator.validEmailRequired': 'Must be a valid email',
	'formInput.validator.uppercaseCharsRequired': (config) =>
		`Must have at least ${config.minimum} uppercase character${config.minimum > 1 ? 's' : ''}`,
	'formInput.validator.defaultPasswordRequirements':
		'8+ characters, at least 1 number and 1 capital letter',
	'sticky.markdownHint': `You can style with <a href="https://docs.n8n.io/workflows/sticky-notes/" target="_blank">Markdown</a>`,
	'tags.showMore': (count) => `+${count} more`,
	'datatable.pageSize': 'Page size',
};
