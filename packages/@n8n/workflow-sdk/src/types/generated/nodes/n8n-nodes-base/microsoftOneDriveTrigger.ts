/**
 * Microsoft OneDrive Trigger Node Types
 *
 * Trigger for Microsoft OneDrive API.
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/microsoftonedrivetrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface MicrosoftOneDriveTriggerV1Params {
	/**
	 * Time at which polling should occur
	 * @default {"item":[{"mode":"everyMinute"}]}
	 */
	pollTimes?: Record<string, unknown>;
	event?: 'fileCreated' | 'fileUpdated' | 'folderCreated' | 'folderUpdated' | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	/**
	 * Whether to watch for the created file in a given folder, rather than the entire OneDrive
	 * @default false
	 */
	watchFolder?: boolean | Expression<boolean>;
	/**
	 * How to select which file to watch
	 * @default anyFile
	 */
	watch?: 'anyFile' | 'selectedFolder' | 'selectedFile' | Expression<string>;
	/**
	 * The file to operate on. The 'By URL' option only accepts URLs that start with 'https://onedrive.live.com'.
	 * @default {"mode":"id","value":""}
	 */
	fileId: ResourceLocatorValue;
	/**
	 * The folder to operate on. The 'By URL' option only accepts URLs that start with 'https://onedrive.live.com'.
	 * @default {"mode":"id","value":"","cachedResultName":""}
	 */
	folderId: ResourceLocatorValue;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftOneDriveTriggerV1Credentials {
	microsoftOneDriveOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MicrosoftOneDriveTriggerV1Node = {
	type: 'n8n-nodes-base.microsoftOneDriveTrigger';
	version: 1;
	config: NodeConfig<MicrosoftOneDriveTriggerV1Params>;
	credentials?: MicrosoftOneDriveTriggerV1Credentials;
	isTrigger: true;
};

export type MicrosoftOneDriveTriggerNode = MicrosoftOneDriveTriggerV1Node;
