import type { PushMessage, WorkerStatus } from '@n8n/api-types';
import type { IWorkflowBase } from 'n8n-workflow';

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
		/** Event type: begin, chunk, end, or error */
		eventType: 'begin' | 'chunk' | 'end' | 'error';
		/** Push reference for the WebSocket connection */
		pushRef: string;
		/** User ID for server-initiated messages (when no pushRef available) */
		userId?: string;
		/** Chat session ID */
		sessionId: string;
		/** Message ID being streamed */
		messageId: string;
		/** Sequence number for ordering */
		sequenceNumber: number;
		/** Event-specific payload */
		payload: {
			previousMessageId?: string | null;
			retryOfMessageId?: string | null;
			executionId?: number | null;
			content?: string;
			status?: string;
			error?: string;
		};
	};

	// #endregion
};

export type PubSubWorkerResponseMap = {
	'response-to-get-worker-status': WorkerStatus & {
		requestingUserId: string;
	};
};

export type PubSubEventMap = PubSubCommandMap & PubSubWorkerResponseMap;
