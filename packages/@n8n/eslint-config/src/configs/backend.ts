import tseslint from 'typescript-eslint';
import globals from 'globals';
import { baseConfig } from './base.js';
import { backendNetworkBoundaryConfig } from './backend-network-boundary.js';
import { encryptionBoundaryConfig } from './encryption-boundary.js';

/**
 * Every package that runs on Node: services, CLIs, backend modules and the
 * repo's own tooling. It carries the two guardrails that only make sense off
 * the browser, so a package cannot reach the cipher primitives or make an
 * unguarded outbound request without opting into them by hand.
 *
 * `nodesConfig` builds on this, so the two nodes packages are covered too.
 */
export const backendConfig = tseslint.config(
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
