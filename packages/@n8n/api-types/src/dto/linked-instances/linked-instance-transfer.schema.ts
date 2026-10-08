import {
	linkedInstanceEntityIdSchema,
	type LinkedInstanceRemoteProject,
} from './linked-instance.schema';

/** en-GB messages. They never repeat the input. */
export const LINKED_INSTANCE_TRANSFER_INPUT_MESSAGES = {
	workflowId: 'Choose a workflow in this instance.',
	remoteWorkflowId: 'Choose a workflow in the linked instance.',
	projectId: 'Choose a project in this instance.',
} as const;

const messages = LINKED_INSTANCE_TRANSFER_INPUT_MESSAGES;

export const linkedInstanceTransferWorkflowIdSchema = linkedInstanceEntityIdSchema(
	messages.workflowId,
);

export const linkedInstanceRemoteWorkflowIdSchema = linkedInstanceEntityIdSchema(
	messages.remoteWorkflowId,
);

export const linkedInstanceTransferProjectIdSchema = linkedInstanceEntityIdSchema(
	messages.projectId,
);

export const LINKED_INSTANCE_TRANSFER_CREDENTIAL_STATUSES = [
	/** The linked instance has a credential with the same name and type, and the move uses it. */
	'matched',
	/** The move creates an empty credential that the user sets up in the linked instance. */
	'needs-set-up',
	/** The linked instance did not list its credentials, for example for an access token without credential access. */
	'unknown',
] as const;

export type LinkedInstanceTransferCredentialStatus =
	(typeof LINKED_INSTANCE_TRANSFER_CREDENTIAL_STATUSES)[number];

/** A credential that the workflow uses. Only its name and type: the move copies no credential data. */
export type LinkedInstanceTransferCredential = {
	name: string;
	type: string;
	status: LinkedInstanceTransferCredentialStatus;
};

/** A workflow that the workflow calls by a fixed ID. `name` is `null` when the user cannot read it. */
export type LinkedInstanceTransferSubWorkflow = { id: string; name: string | null };

/** What a move of one workflow to a linked instance would do. A preflight changes nothing. */
export type LinkedInstanceTransferPreflight = {
	workflowName: string;
	moves: { nodes: number };
	/**
	 * `unknown` when the linked instance lists no node types for a program to compare. Then
	 * `missingNodeTypes` is empty, and the result of the move lists the missing node types.
	 */
	nodeTypeCheck: 'checked' | 'unknown';
	/** Node types that the linked instance does not have, as "type@version". */
	missingNodeTypes: string[];
	credentials: LinkedInstanceTransferCredential[];
	/** Where the workflow goes. `null`: the personal project of the access token's user. */
	targetProject: LinkedInstanceRemoteProject | null;
	/** A move copies one workflow only, so the workflow cannot move while this list is not empty. */
	subWorkflowCalls: LinkedInstanceTransferSubWorkflow[];
};

/** An empty credential that the user must set up before the copy can run. */
export type LinkedInstanceCredentialNeedingSetup = { id: string; name: string; type: string };

/** The result of a move to a linked instance. */
export type LinkedInstancePushResult = {
	remoteWorkflowId: string;
	/** Opens the copy in the editor of the linked instance. */
	remoteUrl: string;
	/** Where the copy is. `null`: the personal project of the access token's user. */
	targetProject: LinkedInstanceRemoteProject | null;
	/** `false` when the move updated the copy of an earlier move. */
	created: boolean;
	/** `true` when a version of the copy is live in the linked instance. */
	published: boolean;
	/** Ids are ids in the linked instance. */
	credentialsNeedingSetup: LinkedInstanceCredentialNeedingSetup[];
	/** Node types that the linked instance does not have, as "type@version". */
	missingNodeTypes: string[];
	/** `true` when the workflow in this instance is turned off after the move. */
	localDeactivated: boolean;
	/** What did not work, then what the linked instance reported. en-GB. */
	warnings: string[];
};

/** The result of bringing a workflow back from a linked instance. */
export type LinkedInstancePullResult = {
	/** The workflow in this instance. */
	workflowId: string;
	workflowName: string;
	/** `false` when the pull updated the workflow of an earlier pull. */
	created: boolean;
	/** `true` when a version of the workflow is live in this instance. */
	published: boolean;
	credentialsNeedingSetup: LinkedInstanceCredentialNeedingSetup[];
	missingNodeTypes: string[];
	warnings: string[];
};
