export type RedisServiceCommand = 'reloadConfig' | 'restartEventBus' | 'stopExecution'; // TODO: add more commands

/**
 * An object to be sent via Redis pub/sub from the main process to the workers.
 * @field command: The command to be executed.
 * @field targets: The targets to execute the command on. Leave empty to execute on all workers or specify worker ids.
 * @field args: Optional arguments to be passed to the command.
 */
export interface RedisServiceCommandObject {
	command: RedisServiceCommand;
	targets?: string[];
	args?: {
		[key: string]: string | number | boolean;
	};
}
