import { defineConfig, globalIgnores } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

// Frozen bundles are test fixtures and keep their bytes.
export default defineConfig(globalIgnores(['fixtures/versions/**']), backendConfig);
