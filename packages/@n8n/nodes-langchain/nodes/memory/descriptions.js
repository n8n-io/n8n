'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.contextWindowLengthProperty =
	exports.sessionKeyProperty =
	exports.expressionSessionKeyProperty =
	exports.sessionIdOption =
		void 0;
exports.sessionIdOption = {
	displayName: 'Session ID',
	name: 'sessionIdType',
	type: 'options',
	options: [
		{
			name: 'Connected Chat Trigger Node',
			value: 'fromInput',
			description:
				"Looks for an input field called 'sessionId' that is coming from a directly connected Chat Trigger",
		},
		{
			name: 'Define below',
			value: 'customKey',
			description: 'Use an expression to reference data in previous nodes or enter static text',
		},
	],
	default: 'fromInput',
};
const expressionSessionKeyProperty = (fromVersion) => ({
	displayName: 'Session Key From Previous Node',
	name: 'sessionKey',
	type: 'string',
	default: '={{ $json.sessionId }}',
	disabledOptions: { show: { sessionIdType: ['fromInput'] } },
	displayOptions: {
		show: {
			sessionIdType: ['fromInput'],
			'@version': [{ _cnd: { gte: fromVersion } }],
		},
	},
});
exports.expressionSessionKeyProperty = expressionSessionKeyProperty;
exports.sessionKeyProperty = {
	displayName: 'Key',
	name: 'sessionKey',
	type: 'string',
	default: '',
	description: 'The key to use to store session ID in the memory',
	displayOptions: {
		show: {
			sessionIdType: ['customKey'],
		},
	},
};
exports.contextWindowLengthProperty = {
	displayName: 'Context Window Length',
	name: 'contextWindowLength',
	type: 'number',
	default: 5,
	hint: 'How many past interactions the model receives as context',
};
//# sourceMappingURL=descriptions.js.map
