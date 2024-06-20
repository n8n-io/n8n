import type { IPushDataType, IPushDataWorkerStatusPayload, IWorkflowDb } from '@/Interfaces';

export type RedisServiceCommand =
	| 'getStatus'
	| 'getId'
	| 'restartEventBus'
	| 'stopWorker'
	| 'reloadLicense'
	| 'reloadExternalSecretsProviders'
	| 'display-workflow-activation' // multi-main only
	| 'display-workflow-deactivation' // multi-main only
	| 'add-webhooks-triggers-and-pollers' // multi-main only
	| 'remove-triggers-and-pollers' // multi-main only
	| 'workflow-failed-to-activate' // multi-main only
	| 'relay-execution-lifecycle-event' // multi-main only
	| 'clear-test-webhooks'; // multi-main only

/**
 * An object to be sent via Redis pub/sub from the main process to the workers.
 * @field command: The command to be executed.
 * @field targets: The targets to execute the command on. Leave empty to execute on all workers or specify worker ids.
 * @field payload: Optional arguments to be sent with the command.
 */
export type RedisServiceBaseCommand =
	| {
			senderId: string;
			command: Exclude<
				RedisServiceCommand,
				'relay-execution-lifecycle-event' | 'clear-test-webhooks'
			>;
			payload?: {
				[key: string]: string | number | boolean | string[] | number[] | boolean[];
			};
	  }
	| {
			senderId: string;
			command: 'relay-execution-lifecycle-event';
			payload: { type: IPushDataType; args: Record<string, unknown>; pushRef: string };
	  }
	| {
			senderId: string;
			command: 'clear-test-webhooks';
			payload: { webhookKey: string; workflowEntity: IWorkflowDb; pushRef: string };
	  };

export type RedisServiceWorkerResponseObject = {
	workerId: string;
} & (
	| RedisServiceBaseCommand
	| {
			command: 'getStatus';
			payload: IPushDataWorkerStatusPayload;
	  }
	| {
			command: 'getId';
	  }
	| {
			command: 'restartEventBus';
			payload: {
				result: 'success' | 'error';
				error?: string;
			};
	  }
	| {
			command: 'reloadExternalSecretsProviders';
			payload: {
				result: 'success' | 'error';
				error?: string;
			};
	  }
	| {
			command: 'stopWorker';
	  }
	| {
			command: 'workflowActiveStateChanged';
			payload: {
				oldState: boolean;
				newState: boolean;
				workflowId: string;
			};
	  }
);

export type RedisServiceCommandObject = {
	targets?: string[];
} & RedisServiceBaseCommand;
