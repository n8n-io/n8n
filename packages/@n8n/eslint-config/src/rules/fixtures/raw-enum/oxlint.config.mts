export default {
	categories: { correctness: 'off' },
	jsPlugins: ['@n8n/eslint-config/plugin'],
	rules: { 'n8n-local-rules/no-raw-enum': 'error' },
};
