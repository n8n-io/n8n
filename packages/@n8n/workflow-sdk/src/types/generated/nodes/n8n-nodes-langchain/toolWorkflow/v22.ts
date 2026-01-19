/**
 * Call n8n Workflow Tool Node - Version 2.2
 * Uses another n8n workflow as a tool. Allows packaging any n8n node(s) as a tool.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolWorkflowV22Config {
	description?: string | Expression<string>;
/**
 * Where to get the workflow to execute from
 * @default database
 */
		source?: 'database' | 'parameter' | Expression<string>;
	workflowId: unknown;
	workflowInputs: string | Expression<string>;
/**
 * The workflow JSON code to execute
 * @displayOptions.show { source: ["parameter"] }
 * @default 









 */
		workflowJson: IDataObject | string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcToolWorkflowV22NodeBase {
	type: '@n8n/n8n-nodes-langchain.toolWorkflow';
	version: 2.2;
	isTrigger: true;
}

export type LcToolWorkflowV22Node = LcToolWorkflowV22NodeBase & {
	config: NodeConfig<LcToolWorkflowV22Config>;
};

export type LcToolWorkflowV22Node = LcToolWorkflowV22Node;