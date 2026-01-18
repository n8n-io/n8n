/**
 * E2E Test Node - Version 1
 * Dummy node used for e2e testing
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface E2eTestV1Params {
	operation?: 'remoteOptions' | 'resourceLocator' | 'resourceMapper' | Expression<string>;
	fieldId?: string | Expression<string>;
/**
 * Remote options to load. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["remoteOptions"] }
 * @default []
 */
		remoteOptions: string | Expression<string>;
	rlc: ResourceLocatorValue;
	resourceMapper: string | Expression<string>;
	otherField?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type E2eTestV1Node = {
	type: 'n8n-nodes-base.e2eTest';
	version: 1;
	config: NodeConfig<E2eTestV1Params>;
	credentials?: Record<string, never>;
};