/**
 * Sticky Note Node Types
 *
 * Make your workflow easier to understand
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/stickynote/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

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
// Node Types
// ===========================================================================

export type StickyNoteV1Node = {
	type: 'n8n-nodes-base.stickyNote';
	version: 1;
	config: NodeConfig<StickyNoteV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type StickyNoteNode = StickyNoteV1Node;
