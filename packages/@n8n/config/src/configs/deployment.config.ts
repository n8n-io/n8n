import { Config, Env } from '../decorators';

@Config
export class DeploymentConfig {
	@Env('N8N_DEPLOYMENT_TYPE')
	type: string = 'default';
}
