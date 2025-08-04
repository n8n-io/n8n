'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.DOCS_HELP_NOTICE =
	exports.EXTERNAL_SECRETS_NAME_REGEX =
	exports.EXTERNAL_SECRETS_MAX_BACKOFF =
	exports.EXTERNAL_SECRETS_INITIAL_BACKOFF =
	exports.EXTERNAL_SECRETS_DB_KEY =
		void 0;
exports.EXTERNAL_SECRETS_DB_KEY = 'feature.externalSecrets';
exports.EXTERNAL_SECRETS_INITIAL_BACKOFF = 10 * 1000;
exports.EXTERNAL_SECRETS_MAX_BACKOFF = 5 * 60 * 1000;
exports.EXTERNAL_SECRETS_NAME_REGEX = /^[a-zA-Z0-9\-\_\/]+$/;
exports.DOCS_HELP_NOTICE = {
	displayName:
		'Need help filling out these fields? <a href="https://docs.n8n.io/external-secrets/#connect-n8n-to-your-secrets-store" target="_blank">Open docs</a>',
	name: 'notice',
	type: 'notice',
	default: '',
	noDataExpression: true,
};
//# sourceMappingURL=constants.js.map
