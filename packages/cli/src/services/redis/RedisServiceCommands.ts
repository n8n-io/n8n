import type { IPushDataWorkerStatusPayload } from '@/Interfaces';

export type RedisServiceCommand =
	| 'getStatus'
	| 'getId'
	| 'restartEventBus'
	| 'stopWorker'
	| 'reloadLicense'
	| 'reloadExternalSecretsProviders';

/**
 * An object to be sent via Redis pub/sub from the main process to the workers.
 * @field command: The command to be executed.
 * @field targets: The targets to execute the command on. Leave empty to execute on all workers or specify worker ids.
 * @field payload: Optional arguments to be sent with the command.
 */
type RedisServiceBaseCommand = {
	senderId: string;
	command: RedisServiceCommand;
	payload?: {
		[key: string]: string | number | boolean | string[] | number[] | boolean[];
	};
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
);

export type RedisServiceCommandObject = {
	targets?: string[];
} & RedisServiceBaseCommand;
