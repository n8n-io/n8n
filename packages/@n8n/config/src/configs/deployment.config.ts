import { Config, Env } from '../decorators';

@Config
export class DeploymentConfig {
	/** Deployment type identifier (for example, `default`, `cloud`). Used for telemetry and feature behavior. */
	@Env('N8N_DEPLOYMENT_TYPE')
	type: string = 'default';

	/**
	 * Which official artefact installed n8n, with its version, for example `helm-chart/1.14.0`.
	 * Set by the artefact itself. Telemetry only: nothing in n8n behaves differently because of it.
	 */
	@Env('N8N_INSTALL_METHOD')
	installMethod: string = '';
}
