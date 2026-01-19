/**
 * Local File Trigger Node - Version 1
 * Triggers a workflow on file system changes
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LocalFileTriggerV1Config {
	triggerOn: 'file' | 'folder' | Expression<string>;
	path?: string | Expression<string>;
/**
 * The events to listen to
 * @displayOptions.show { triggerOn: ["folder"] }
 * @default []
 */
		events: Array<'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LocalFileTriggerV1NodeBase {
	type: 'n8n-nodes-base.localFileTrigger';
	version: 1;
	isTrigger: true;
}

export type LocalFileTriggerV1Node = LocalFileTriggerV1NodeBase & {
	config: NodeConfig<LocalFileTriggerV1Config>;
};

export type LocalFileTriggerV1Node = LocalFileTriggerV1Node;