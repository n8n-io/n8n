/**
 * FTP Node Types
 *
 * Transfer files via FTP or SFTP
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/ftp/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FtpV1Params {
	/**
	 * File transfer protocol
	 * @default ftp
	 */
	protocol?: 'ftp' | 'sftp' | Expression<string>;
	operation?: 'delete' | 'download' | 'list' | 'rename' | 'upload' | Expression<string>;
	/**
	 * The file path of the file to delete. Has to contain the full path.
	 * @displayOptions.show { operation: ["delete"] }
	 */
	path: string | Expression<string>;
	options?: Record<string, unknown>;
	binaryPropertyName: string | Expression<string>;
	oldPath: string | Expression<string>;
	newPath: string | Expression<string>;
	/**
	 * The text content of the file to upload
	 * @displayOptions.show { operation: ["upload"] }
	 * @default true
	 */
	binaryData?: boolean | Expression<boolean>;
	/**
	 * The text content of the file to upload
	 * @displayOptions.show { operation: ["upload"], binaryData: [false] }
	 */
	fileContent?: string | Expression<string>;
	/**
	 * Whether to return object representing all directories / objects recursively found within SFTP server
	 * @displayOptions.show { operation: ["list"] }
	 * @default false
	 */
	recursive: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface FtpV1Credentials {
	ftp: CredentialReference;
	sftp: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type FtpV1Node = {
	type: 'n8n-nodes-base.ftp';
	version: 1;
	config: NodeConfig<FtpV1Params>;
	credentials?: FtpV1Credentials;
};

export type FtpNode = FtpV1Node;
