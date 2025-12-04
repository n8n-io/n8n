import { Config, Env } from '../decorators';

@Config
export class ComputerUseConfig {
	/** Base URL for the Computer Use API service (e.g., http://localhost:8765) */
	@Env('N8N_COMPUTER_USE_URL')
	url: string = '';
}
