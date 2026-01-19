/**
 * Figma Trigger (Beta) Node - Version 1
 * Starts the workflow when Figma events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FigmaTriggerV1Config {
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
// Node Types
// ===========================================================================

interface FigmaTriggerV1NodeBase {
	type: 'n8n-nodes-base.figmaTrigger';
	version: 1;
	credentials?: FigmaTriggerV1Credentials;
	isTrigger: true;
}

export type FigmaTriggerV1Node = FigmaTriggerV1NodeBase & {
	config: NodeConfig<FigmaTriggerV1Config>;
};

export type FigmaTriggerV1Node = FigmaTriggerV1Node;