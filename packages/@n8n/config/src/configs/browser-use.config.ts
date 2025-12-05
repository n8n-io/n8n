import { Config, Env } from '../decorators';

@Config
export class BrowserUseConfig {
	/** Base URL for the Browser Use API service (e.g., http://localhost:8766) */
	@Env('N8N_BROWSER_USE_URL')
	url: string = '';
}
