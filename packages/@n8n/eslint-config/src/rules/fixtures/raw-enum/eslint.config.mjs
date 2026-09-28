import { localRulesPlugin } from '@n8n/eslint-config/plugin';
import tseslint from 'typescript-eslint';

export default tseslint.config({
	files: ['**/*.ts'],
	languageOptions: { parser: tseslint.parser },
	plugins: { 'n8n-local-rules': localRulesPlugin },
	rules: { 'n8n-local-rules/no-raw-enum': 'error' },
});
