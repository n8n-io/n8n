import type { PushMessage, WorkerStatus } from '@n8n/api-types';
import type { IWorkflowBase } from 'n8n-workflow';

export type PubSubCommandMap = {
	// #region Lifecycle

	'reload-license': never;

	'restart-event-bus': never;

	'reload-external-secrets-providers': never;

	// #endregion

	// # region SSO

	'reload-oidc-config': never;
	'reload-saml-config': never;

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
	};

	// #endregion

	// #region Worker view

	'get-worker-id': never;

	'get-worker-status': never;

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

	// #endregion
};

export type PubSubWorkerResponseMap = {
	'response-to-get-worker-status': WorkerStatus;
};

export type PubSubEventMap = PubSubCommandMap & PubSubWorkerResponseMap;
