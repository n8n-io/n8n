import { Config, Env } from '../decorators';

@Config
export class TaskRunnersConfig {
	// Defaults to true for now
	@Env('N8N_RUNNERS_DISABLED')
	disabled: boolean = true;

	@Env('N8N_RUNNERS_PATH')
	path: string = '/runners';

	@Env('N8N_RUNNERS_AUTH_TOKEN')
	authToken: string = '';
}
