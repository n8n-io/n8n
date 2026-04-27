import { Config, Env } from '@n8n/config';

@Config
export class FrontendBuilderConfig {
	/**
	 * v0 Platform API key. When unset (the default), the module wires
	 * `FakeV0Client` so dev can click through the UI without credentials.
	 * The module being loaded at all is gated by `N8N_ENABLED_MODULES`,
	 * not by this config.
	 */
	@Env('V0_API_KEY')
	apiKey: string = '';
}
