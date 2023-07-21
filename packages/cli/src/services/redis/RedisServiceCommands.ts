export type RedisServiceCommand = 'getStatus' | 'restartEventBus' | 'stopWorker'; // TODO: add more commands

/**
 * An object to be sent via Redis pub/sub from the main process to the workers.
 * @field command: The command to be executed.
 * @field targets: The targets to execute the command on. Leave empty to execute on all workers or specify worker ids.
 * @field args: Optional arguments to be passed to the command.
 */
type RedisServiceBaseCommand = {
	command: RedisServiceCommand;
	payload?: {
		[key: string]: string | number | boolean | string[] | number[] | boolean[];
	};
};

export type RedisServiceWorkerResponseObject = {
	workerId: string;
} & RedisServiceBaseCommand;

export type RedisServiceCommandObject = {
	targets?: string[];
} & RedisServiceBaseCommand;
