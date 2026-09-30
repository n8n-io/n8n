import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

// Reference solutions follow the format of each project under test, not this package.
export default defineConfig({ ignores: ['evaluations/node-building/reference/**'] }, backendConfig);
