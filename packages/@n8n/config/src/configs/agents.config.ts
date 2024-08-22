import { Config, Env } from '../decorators';

@Config
export class AgentsConfig {
	// Defaults to false for now
	@Env('N8N_AGENTS_DISABLED')
	disabled: boolean = true;

	@Env('N8N_AGENTS_PATH')
	path: string = '/agents/_ws';
}
