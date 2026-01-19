/**
 * Chat Node - Version 1
 * Send a message into the chat
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcChatV1Params {
	message: string | Expression<string>;
	responseType?: 'approval' | 'freeTextChat' | Expression<string>;
/**
 * Whether to block input from the user while waiting for approval
 * @displayOptions.show { responseType: ["approval"] }
 * @default false
 */
		blockUserInput?: boolean | Expression<boolean>;
	defineForm?: 'fields' | 'json' | Expression<string>;
	jsonOutput?: IDataObject | string | Expression<string>;
	approvalOptions?: {
		values?: {
			/** Type of Approval
			 * @default single
			 */
			approvalType?: 'single' | 'double' | Expression<string>;
			/** Approve Button Label
			 * @displayOptions.show { approvalType: ["single", "double"] }
			 * @default Approve
			 */
			approveLabel?: string | Expression<string>;
			/** Approve Button Style
			 * @displayOptions.show { approvalType: ["single", "double"] }
			 * @default primary
			 */
			buttonApprovalStyle?: 'primary' | 'secondary' | Expression<string>;
			/** Disapprove Button Label
			 * @displayOptions.show { approvalType: ["double"] }
			 * @default Decline
			 */
			disapproveLabel?: string | Expression<string>;
			/** Disapprove Button Style
			 * @displayOptions.show { approvalType: ["double"] }
			 * @default secondary
			 */
			buttonDisapprovalStyle?: 'primary' | 'secondary' | Expression<string>;
		};
	};
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcChatV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.chat';
	version: 1;
}

export type LcChatV1ParamsNode = LcChatV1NodeBase & {
	config: NodeConfig<LcChatV1Params>;
};

export type LcChatV1Node = LcChatV1ParamsNode;