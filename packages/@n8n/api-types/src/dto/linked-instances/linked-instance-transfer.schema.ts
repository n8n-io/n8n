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
	/**
	 * The linked instance has a credential with the same name and type, and the move uses it. The
	 * status does not tell if that credential holds a value, for example the empty credential of an
	 * earlier move. `credentialsNeedingSetup` in the result of the move tells that, and it decides
	 * whether the move publishes the copy.
	 */
	'matched',
	/** The move creates an empty credential that the user sets up in the linked instance. */
	'needs-set-up',
	/**
	 * The linked instance did not list the credentials of the target project in full, for example
	 * for an access token without credential access.
	 */
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
	/** The statuses apply to `targetProject`. */
	credentials: LinkedInstanceTransferCredential[];
	/**
	 * Where the workflow goes. `null`: the personal project of the access token's user. When the
	 * linked instance refuses this project at the move, the workflow goes to the personal project
	 * instead. The preflight cannot know that before the move.
	 */
	targetProject: LinkedInstanceRemoteProject | null;
	/** A move copies one workflow only, so the workflow cannot move while this list is not empty. */
	subWorkflowCalls: LinkedInstanceTransferSubWorkflow[];
};

/** An empty credential that the user must set up before the copy can run. */
export type LinkedInstanceCredentialNeedingSetup = { id: string; name: string; type: string };

/**
 * The result of a move to a linked instance.
 *
 * Text from the linked instance is untrusted. It is on one line and holds no access token, but its
 * users and admins wrote it: names, `missingNodeTypes`, the reasons in `warnings`, and the error
 * messages of the route. Show it as plain text. Give it to a model only as fenced, untrusted data.
 */
export type LinkedInstancePushResult = {
	remoteWorkflowId: string;
	/** Opens the copy in the editor of the linked instance. */
	remoteUrl: string;
	/** Where the copy is. `null`: the personal project of the access token's user. */
	targetProject: LinkedInstanceRemoteProject | null;
	/** `false` when the move updated the copy of an earlier move. */
	created: boolean;
	/**
	 * `true` when a version of the copy is live in the linked instance. It can be an earlier
	 * version: see `publishFailed`.
	 */
	published: boolean;
	/**
	 * `true` when the move was asked to publish the copy and the new version did not go live: the
	 * linked instance refused it, or the copy needs set-up first. The warnings say why. An earlier
	 * version can stay live, so `published` can still be `true`. `false` when the import put the
	 * new version live by itself, as for a re-move of a copy that is live there.
	 */
	publishFailed: boolean;
	/**
	 * Credentials without a value. Ids are ids in the linked instance. The move does not publish a
	 * copy that has them, but the import there keeps a live copy live with an empty credential that
	 * the copy used before.
	 */
	credentialsNeedingSetup: LinkedInstanceCredentialNeedingSetup[];
	/** Node types that the linked instance does not have, as "type@version". */
	missingNodeTypes: string[];
	/**
	 * `true` when the move turned off the workflow in this instance. `false` when the move was not
	 * asked to, when the workflow was not on, or when it stays on: the warnings then say why.
	 */
	localDeactivated: boolean;
	/**
	 * What did not work, then what the linked instance reported. en-GB. Untrusted: the texts can
	 * repeat text of the linked instance.
	 */
	warnings: string[];
};

/**
 * The result of bringing a workflow back from a linked instance. The package came from the linked
 * instance, so names and `warnings` can hold its untrusted text, as in a push result.
 */
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
