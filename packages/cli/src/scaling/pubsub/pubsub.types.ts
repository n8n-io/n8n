import type { PushType, WorkerStatus } from '@n8n/api-types';

import type { IWorkflowDb } from '@/interfaces';
import type { Resolve } from '@/utlity.types';

import type { COMMAND_PUBSUB_CHANNEL, WORKER_RESPONSE_PUBSUB_CHANNEL } from '../constants';

export namespace PubSub {
	// ----------------------------------
	//             channels
	// ----------------------------------

	/** Pubsub channel used by scaling mode. */
	export type Channel = typeof COMMAND_PUBSUB_CHANNEL | typeof WORKER_RESPONSE_PUBSUB_CHANNEL;

	/** Handler function for every message received via a pubsub channel. */
	export type HandlerFn = (msg: string) => void;

	// ----------------------------------
	//            commands
	// ----------------------------------

	export type CommandMap = {
		// #region Lifecycle

		'reload-license': never;

		'restart-event-bus': never;

		'reload-external-secrets-providers': never;

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

	type _ToCommand<CommandKey extends keyof CommandMap> = {
		senderId: string;
		targets?: string[];
		command: CommandKey;
	} & (CommandMap[CommandKey] extends never
		? { payload?: never } // some commands carry no payload
		: { payload: CommandMap[CommandKey] });

	type ToCommand<CommandKey extends keyof CommandMap> = Resolve<_ToCommand<CommandKey>>;

	namespace Command {
		export type ReloadLicense = ToCommand<'reload-license'>;
		export type RestartEventBus = ToCommand<'restart-event-bus'>;
		export type ReloadExternalSecretsProviders = ToCommand<'reload-external-secrets-providers'>;
		export type CommunityPackageInstall = ToCommand<'community-package-install'>;
		export type CommunityPackageUpdate = ToCommand<'community-package-update'>;
		export type CommunityPackageUninstall = ToCommand<'community-package-uninstall'>;
		export type GetWorkerId = ToCommand<'get-worker-id'>;
		export type GetWorkerStatus = ToCommand<'get-worker-status'>;
		export type AddWebhooksTriggersAndPollers = ToCommand<'add-webhooks-triggers-and-pollers'>;
		export type RemoveTriggersAndPollers = ToCommand<'remove-triggers-and-pollers'>;
		export type DisplayWorkflowActivation = ToCommand<'display-workflow-activation'>;
		export type DisplayWorkflowDeactivation = ToCommand<'display-workflow-deactivation'>;
		export type DisplayWorkflowActivationError = ToCommand<'display-workflow-activation-error'>;
		export type RelayExecutionLifecycleEvent = ToCommand<'relay-execution-lifecycle-event'>;
		export type ClearTestWebhooks = ToCommand<'clear-test-webhooks'>;
	}

	/** Command sent via the `n8n.commands` pubsub channel. */
	export type Command =
		| Command.ReloadLicense
		| Command.RestartEventBus
		| Command.ReloadExternalSecretsProviders
		| Command.CommunityPackageInstall
		| Command.CommunityPackageUpdate
		| Command.CommunityPackageUninstall
		| Command.GetWorkerId
		| Command.GetWorkerStatus
		| Command.AddWebhooksTriggersAndPollers
		| Command.RemoveTriggersAndPollers
		| Command.DisplayWorkflowActivation
		| Command.DisplayWorkflowDeactivation
		| Command.DisplayWorkflowActivationError
		| Command.RelayExecutionLifecycleEvent
		| Command.ClearTestWebhooks;

	// ----------------------------------
	//         worker responses
	// ----------------------------------

	export type WorkerResponseMap = {
		// #region Lifecycle

		'restart-event-bus': {
			result: 'success' | 'error';
			error?: string;
		};

		'reload-external-secrets-providers': {
			result: 'success' | 'error';
			error?: string;
		};

		// #endregion

		// #region Worker view

		'get-worker-id': never;

		'get-worker-status': WorkerStatus;

		// #endregion
	};

	type _ToWorkerResponse<WorkerResponseKey extends keyof WorkerResponseMap> = {
		workerId: string;
		targets?: string[];
		command: WorkerResponseKey;
	} & (WorkerResponseMap[WorkerResponseKey] extends never
		? { payload?: never } // some responses carry no payload
		: { payload: WorkerResponseMap[WorkerResponseKey] });

	type ToWorkerResponse<WorkerResponseKey extends keyof WorkerResponseMap> = Resolve<
		_ToWorkerResponse<WorkerResponseKey>
	>;

	namespace WorkerResponse {
		export type RestartEventBus = ToWorkerResponse<'restart-event-bus'>;
		export type ReloadExternalSecretsProviders =
			ToWorkerResponse<'reload-external-secrets-providers'>;
		export type GetWorkerId = ToWorkerResponse<'get-worker-id'>;
		export type GetWorkerStatus = ToWorkerResponse<'get-worker-status'>;
	}

	/** Response sent via the `n8n.worker-response` pubsub channel. */
	export type WorkerResponse =
		| WorkerResponse.RestartEventBus
		| WorkerResponse.ReloadExternalSecretsProviders
		| WorkerResponse.GetWorkerId
		| WorkerResponse.GetWorkerStatus;
}
