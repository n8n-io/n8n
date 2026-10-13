import { defineConfig } from 'oxlint';
import { backendNetworkBoundaryConfig } from './backend-network-boundary.js';
import { baseConfig } from './base.js';
import { encryptionBoundaryConfig } from './encryption-boundary.js';

export const backendConfig = defineConfig({
	extends: [baseConfig, backendNetworkBoundaryConfig, encryptionBoundaryConfig],
	env: { builtin: true, es2024: true, commonjs: true, node: true },
});

export default backendConfig;
