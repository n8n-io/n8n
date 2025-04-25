import frontendConfig from '@n8n/eslint-config/frontend';
import { defineConfig } from 'eslint/config';

export default defineConfig({
	files: ['**/*.ts', '**/*.vue'],
	extends: [frontendConfig],
});
