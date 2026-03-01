import type { ChatHubMessageStatus, PushMessage, WorkerStatus } from '@n8n/api-types';
import type { IWorkflowBase, WorkflowActivateMode } from 'n8n-workflow';

export type PubSubCommandMap = {
	// #region Lifecycle

	'reload-license': never;

	'restart-event-bus': never;

	'reload-external-secrets-providers': never;

	// #endregion

	// # region Credentials
	'reload-overwrite-credentials': never;
	// #endregion

	// # region SSO

	'reload-oidc-config': never;
	'reload-saml-config': never;

	// # sso provisioning
	'reload-sso-provisioning-configuration': never;

	// #endregion

	'reload-source-control-config': never;

	// #region Community packages

	'community-package-install': {
		packageName: string;
		packageVersion: string;
	};

	'community-package-update': {
		packageName: string;
		packageVersion: string;
	};

	'community-package-uninstall': {
		packageName: string;
	};

	// #endregion

	// #region Worker view

	'get-worker-id': never;

	'get-worker-status': {
		requestingUserId: string;
	};

	// #endregion

	// #region Multi-main setup

	'add-webhooks-triggers-and-pollers': {
		workflowId: string;
		activeVersionId: string;
		activationMode: WorkflowActivateMode;
	};

	'remove-triggers-and-pollers': {
		workflowId: string;
	};

	'display-workflow-activation': {
		workflowId: string;
		activeVersionId: string;
	};

	'display-workflow-deactivation': {
		workflowId: string;
	};

	'display-workflow-activation-error': {
		workflowId: string;
		errorMessage: string;
	};

	'relay-execution-lifecycle-event': PushMessage & {
		pushRef: string;
		asBinary: boolean;
	};

	'clear-test-webhooks': {
		webhookKey: string;
		workflowEntity: IWorkflowBase;
		pushRef: string;
	};

	/**
	 * Relay chat stream events between main instances.
	 * Used when the main handling the workflow execution is different from
	 * the main that has the WebSocket connection to the client.
	 */
	'relay-chat-stream-event': {
		/** Event type: execution-level or message-level */
		eventType: 'execution-begin' | 'execution-end' | 'begin' | 'chunk' | 'end' | 'error';
		/** User ID - sends to all user connections */
		userId: string;
		/** Chat session ID */
		sessionId: string;
		/** Message ID being streamed (empty for execution-level events) */
		messageId: string;
		/** Sequence number for ordering (0 for execution-level events) */
		sequenceNumber: number;
		/** Event-specific payload */
		payload: {
			previousMessageId?: string | null;
			retryOfMessageId?: string | null;
			executionId?: number | null;
			content?: string;
			status?: ChatHubMessageStatus;
			error?: string;
		};
	};

	/**
	 * Relay human message events between main instances.
	 * Used for cross-client synchronization when a user sends a message
	 * from one browser window and other windows need to be updated.
	 */
	'relay-chat-human-message': {
		/** User ID - sends to all user connections */
		userId: string;
		/** Chat session ID */
		sessionId: string;
		/** Human message ID */
		messageId: string;
		/** ID of the previous message in the chain */
		previousMessageId: string | null;
		/** Message content */
		content: string;
		/** Attachments on the message */
		attachments: Array<{ id: string; fileName: string; mimeType: string }>;
	};

	/**
	 * Relay message edit events between main instances.
	 * Used for cross-client synchronization when a user edits a message
	 * from one browser window and other windows need to be updated.
	 */
	'relay-chat-message-edit': {
		/** User ID - sends to all user connections */
		userId: string;
		/** Chat session ID */
		sessionId: string;
		/** ID of the message being revised */
		revisionOfMessageId: string;
		/** ID of this message (the revised version) */
		messageId: string;
		/** New message content */
		content: string;
		/** Attachments on the new message */
		attachments: Array<{ id: string; fileName: string; mimeType: string }>;
	};

	// #endregion

	// #region Evaluation

	/**
	 * Cancel a test run across all main instances.
	 * Used in multi-main mode to signal cancellation to the instance running the test.
	 */
	'cancel-test-run': {
		testRunId: string;
	};

	// #endregion
};

export type PubSubWorkerResponseMap = {
	'response-to-get-worker-status': WorkerStatus & {
		requestingUserId: string;
	};
};

export type PubSubEventMap = PubSubCommandMap & PubSubWorkerResponseMap;
