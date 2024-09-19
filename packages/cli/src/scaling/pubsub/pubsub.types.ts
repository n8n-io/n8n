import type { PushType, WorkerStatus } from '@n8n/api-types';

import type { IWorkflowDb } from '@/interfaces';

import type { COMMAND_PUBSUB_CHANNEL, WORKER_RESPONSE_PUBSUB_CHANNEL } from '../constants';

/**
 * Pubsub channel used by scaling mode:
 *
 * - `n8n.commands` for messages sent by a main process to command workers or other main processes
 * - `n8n.worker-response` for messages sent by workers in response to commands from main processes
 */
export type ScalingPubSubChannel =
	| typeof COMMAND_PUBSUB_CHANNEL
	| typeof WORKER_RESPONSE_PUBSUB_CHANNEL;

export type PubSubMessageMap = {
	// #region Lifecycle

	'reload-license': never;

	'restart-event-bus': {
		result: 'success' | 'error';
		error?: string;
	};

	'reload-external-secrets-providers': {
		result: 'success' | 'error';
		error?: string;
	};

	'stop-worker': never;

	// #endregion

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
		packageVersion: string;
	};

	// #endregion

	// #region Worker view

	'get-worker-id': never;

	'get-worker-status': WorkerStatus;

	// #endregion

	// #region Multi-main setup

	'add-webhooks-triggers-and-pollers': {
		workflowId: string;
	};

	'remove-triggers-and-pollers': {
		workflowId: string;
	};

	'display-workflow-activation': {
		workflowId: string;
	};

	'display-workflow-deactivation': {
		workflowId: string;
	};

	// currently 'workflow-failed-to-activate'
	'display-workflow-activation-error': {
		workflowId: string;
		errorMessage: string;
	};

	'relay-execution-lifecycle-event': {
		type: PushType;
		args: Record<string, unknown>;
		pushRef: string;
	};

	'clear-test-webhooks': {
		webhookKey: string;
		workflowEntity: IWorkflowDb;
		pushRef: string;
	};

	// #endregion
};
