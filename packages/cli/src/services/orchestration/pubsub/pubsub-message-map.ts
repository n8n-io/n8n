import type { PushType, WorkerStatus } from '@n8n/api-types';

import type { IWorkflowDb } from '@/interfaces';

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
