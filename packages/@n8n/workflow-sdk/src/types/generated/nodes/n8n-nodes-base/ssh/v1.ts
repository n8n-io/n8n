/**
 * SSH Node - Version 1
 * Execute commands via SSH
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Execute a command */
export type SshV1CommandExecuteConfig = {
	resource: 'command';
	operation: 'execute';
/**
 * The command to be executed on a remote device
 * @displayOptions.show { resource: ["command"], operation: ["execute"] }
 */
		command?: string | Expression<string>;
	cwd: string | Expression<string>;
};

/** Download a file */
export type SshV1FileDownloadConfig = {
	resource: 'file';
	operation: 'download';
/**
 * The file path of the file to download. Has to contain the full path including file name.
 * @displayOptions.show { resource: ["file"], operation: ["download"] }
 */
		path: string | Expression<string>;
/**
 * Object property name which holds binary data
 * @displayOptions.show { resource: ["file"], operation: ["download"] }
 * @default data
 */
		binaryPropertyName: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Upload a file */
export type SshV1FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
	binaryPropertyName: string | Expression<string>;
/**
 * The directory to upload the file to. The name of the file does not need to be specified, it's taken from the binary data file name. To override this behavior, set the parameter "File Name" under options.
 * @displayOptions.show { resource: ["file"], operation: ["upload"] }
 */
		path: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type SshV1Params =
	| SshV1CommandExecuteConfig
	| SshV1FileDownloadConfig
	| SshV1FileUploadConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type SshV1CommandExecuteOutput = {
	code?: number;
	signal?: null;
	stderr?: string;
	stdout?: string;
};

export type SshV1FileDownloadOutput = {
	code?: number;
	signal?: null;
	stderr?: string;
	stdout?: string;
};

export type SshV1FileUploadOutput = {
	success?: boolean;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface SshV1Credentials {
	sshPassword: CredentialReference;
	sshPrivateKey: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface SshV1NodeBase {
	type: 'n8n-nodes-base.ssh';
	version: 1;
	credentials?: SshV1Credentials;
}

export type SshV1CommandExecuteNode = SshV1NodeBase & {
	config: NodeConfig<SshV1CommandExecuteConfig>;
	output?: SshV1CommandExecuteOutput;
};

export type SshV1FileDownloadNode = SshV1NodeBase & {
	config: NodeConfig<SshV1FileDownloadConfig>;
	output?: SshV1FileDownloadOutput;
};

export type SshV1FileUploadNode = SshV1NodeBase & {
	config: NodeConfig<SshV1FileUploadConfig>;
	output?: SshV1FileUploadOutput;
};

export type SshV1Node =
	| SshV1CommandExecuteNode
	| SshV1FileDownloadNode
	| SshV1FileUploadNode
	;