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

	/** IP address task runners server should listen on */
	@Env('N8N_RUNNERS_SERVER_PORT')
	port: number = 5679;

	/** IP address task runners server should listen on */
	@Env('N8N_RUNNERS_SERVER_LISTEN_ADDRESS')
	listen_address: string = '127.0.0.1';
}
