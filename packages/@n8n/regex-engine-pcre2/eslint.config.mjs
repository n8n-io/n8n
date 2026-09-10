import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(baseConfig, {
	ignores: ['native/**', 'vendor/**', 'src/generated/**', 'build/**', 'native-oracle-build/**'],
});
