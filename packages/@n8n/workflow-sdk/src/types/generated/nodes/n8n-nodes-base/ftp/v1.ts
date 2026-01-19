/**
 * FTP Node - Version 1
 * Transfer files via FTP or SFTP
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FtpV1Config {
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

interface FtpV1NodeBase {
	type: 'n8n-nodes-base.ftp';
	version: 1;
	credentials?: FtpV1Credentials;
}

export type FtpV1Node = FtpV1NodeBase & {
	config: NodeConfig<FtpV1Config>;
};

export type FtpV1Node = FtpV1Node;