/**
 * Sticky Note Node - Version 1
 * Make your workflow easier to understand
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface StickyNoteV1Params {
	content?: string | Expression<string>;
	height: number | Expression<number>;
	width: number | Expression<number>;
	color: number | Expression<number>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type StickyNoteV1Node = {
	type: 'n8n-nodes-base.stickyNote';
	version: 1;
	config: NodeConfig<StickyNoteV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};