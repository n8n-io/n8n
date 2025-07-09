import { Config, Env } from '@n8n/config';

@Config
export class JsRunnerConfig {
	@Env('NODE_FUNCTION_ALLOW_BUILTIN')
	allowedBuiltInModules: string = '';

	@Env('NODE_FUNCTION_ALLOW_EXTERNAL')
	allowedExternalModules: string = '';

	@Env('N8N_RUNNERS_INSECURE_MODE')
	insecureMode: boolean = false;
}
