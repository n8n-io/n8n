/**
 * Figma Trigger (Beta) Node - Version 1
 * Starts the workflow when Figma events occur
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FigmaTriggerV1Params {
/**
 * Trigger will monitor this Figma Team for changes. Team ID can be found in the URL of a Figma Team page when viewed in a web browser: figma.com/files/team/{TEAM-ID}/.
 */
		teamId: string | Expression<string>;
	triggerOn: 'fileComment' | 'fileDelete' | 'fileUpdate' | 'fileVersionUpdate' | 'libraryPublish' | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface FigmaTriggerV1Credentials {
	figmaApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type FigmaTriggerV1Node = {
	type: 'n8n-nodes-base.figmaTrigger';
	version: 1;
	config: NodeConfig<FigmaTriggerV1Params>;
	credentials?: FigmaTriggerV1Credentials;
	isTrigger: true;
};