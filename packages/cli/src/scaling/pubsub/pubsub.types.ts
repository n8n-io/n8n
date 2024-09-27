import type { PubSubCommandMap, PubSubWorkerResponseMap } from '@/events/maps/pub-sub.event-map';
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

	type _ToCommand<CommandKey extends keyof PubSubCommandMap> = {
		senderId: string;
		targets?: string[];
		command: CommandKey;
	} & (PubSubCommandMap[CommandKey] extends never
		? { payload?: never } // some commands carry no payload
		: { payload: PubSubCommandMap[CommandKey] });

	type ToCommand<CommandKey extends keyof PubSubCommandMap> = Resolve<_ToCommand<CommandKey>>;

	namespace Commands {
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
		| Commands.ReloadLicense
		| Commands.RestartEventBus
		| Commands.ReloadExternalSecretsProviders
		| Commands.CommunityPackageInstall
		| Commands.CommunityPackageUpdate
		| Commands.CommunityPackageUninstall
		| Commands.GetWorkerId
		| Commands.GetWorkerStatus
		| Commands.AddWebhooksTriggersAndPollers
		| Commands.RemoveTriggersAndPollers
		| Commands.DisplayWorkflowActivation
		| Commands.DisplayWorkflowDeactivation
		| Commands.DisplayWorkflowActivationError
		| Commands.RelayExecutionLifecycleEvent
		| Commands.ClearTestWebhooks;

	// ----------------------------------
	//         worker responses
	// ----------------------------------

	type _ToWorkerResponse<WorkerResponseKey extends keyof PubSubWorkerResponseMap> = {
		workerId: string;
		targets?: string[];
		command: WorkerResponseKey;
	} & (PubSubWorkerResponseMap[WorkerResponseKey] extends never
		? { payload?: never } // some responses carry no payload
		: { payload: PubSubWorkerResponseMap[WorkerResponseKey] });

	type ToWorkerResponse<WorkerResponseKey extends keyof PubSubWorkerResponseMap> = Resolve<
		_ToWorkerResponse<WorkerResponseKey>
	>;

	namespace WorkerResponses {
		export type RestartEventBus = ToWorkerResponse<'restart-event-bus'>;
		export type ReloadExternalSecretsProviders =
			ToWorkerResponse<'reload-external-secrets-providers'>;
		export type GetWorkerId = ToWorkerResponse<'get-worker-id'>;
		export type GetWorkerStatus = ToWorkerResponse<'get-worker-status'>;
	}

	/** Response sent via the `n8n.worker-response` pubsub channel. */
	export type WorkerResponse =
		| WorkerResponses.RestartEventBus
		| WorkerResponses.ReloadExternalSecretsProviders
		| WorkerResponses.GetWorkerId
		| WorkerResponses.GetWorkerStatus;
}
