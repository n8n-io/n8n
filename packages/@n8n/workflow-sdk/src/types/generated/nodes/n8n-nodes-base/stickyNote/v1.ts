/**
 * Sticky Note Node - Version 1
 * Make your workflow easier to understand
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
// Node Types
// ===========================================================================

interface StickyNoteV1NodeBase {
	type: 'n8n-nodes-base.stickyNote';
	version: 1;
	isTrigger: true;
}

export type StickyNoteV1ParamsNode = StickyNoteV1NodeBase & {
	config: NodeConfig<StickyNoteV1Params>;
};

export type StickyNoteV1Node = StickyNoteV1ParamsNode;