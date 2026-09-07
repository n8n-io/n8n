import tseslint from 'typescript-eslint';
import globals from 'globals';
import { baseConfig } from './base.js';
import { backendNetworkBoundaryConfig } from './backend-network-boundary.js';
import { encryptionBoundaryConfig } from './encryption-boundary.js';

export const nodeConfig = tseslint.config(
	baseConfig,
	backendNetworkBoundaryConfig,
	encryptionBoundaryConfig,
	{
		languageOptions: {
			ecmaVersion: 2024,
			globals: globals.node,
		},
	},
);
