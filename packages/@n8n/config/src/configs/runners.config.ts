import { Config, Env } from '../decorators';

@Config
export class TaskRunnersConfig {
	// Defaults to false for now
	@Env('N8N_RUNNERS_DISABLED')
	disabled: boolean = true;

	@Env('N8N_RUNNERS_PATH')
	path: string = '/runners/_ws';
}
