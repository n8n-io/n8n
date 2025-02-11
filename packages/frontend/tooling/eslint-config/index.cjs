const sharedOptions = require('@n8n_io/eslint-config/shared');

/**
 * @param {string} path
 * @param {import('@types/eslint').ESLint.ConfigData} config
 * @returns {import('@types/eslint').ESLint.ConfigData}
 */
module.exports.createFrontendEslintConfig = function (path, config = {}) {
	return {
		extends: ['@n8n_io/eslint-config/frontend'],
		...sharedOptions(path, 'frontend'),
		...config,
	};
};
