/**
 * Local File Trigger Node Types
 *
 * Triggers a workflow on file system changes
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/localfiletrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LocalFileTriggerV1Params {
	triggerOn: 'file' | 'folder' | Expression<string>;
	path?: string | Expression<string>;
	/**
	 * The events to listen to
	 * @default []
	 */
	events: Array<'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LocalFileTriggerNode = {
	type: 'n8n-nodes-base.localFileTrigger';
	version: 1;
	config: NodeConfig<LocalFileTriggerV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};
