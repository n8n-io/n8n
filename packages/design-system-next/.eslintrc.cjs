/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

const { sharedOptions } = require('@n8n_io/eslint-config/shared');

/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	...sharedOptions(__dirname, 'frontend'),
	extends: ['@n8n_io/eslint-config/frontend'],
  'extends': [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  }
}
