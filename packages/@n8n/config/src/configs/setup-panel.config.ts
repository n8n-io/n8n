import { Config, Env } from '../decorators';

@Config
export class SetupPanelConfig {
	@Env('N8N_SETUP_PANEL_ENABLED')
	enabled: boolean = false;
}
