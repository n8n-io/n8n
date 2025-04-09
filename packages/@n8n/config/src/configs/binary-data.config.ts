import { Config, Env } from '../decorators';

@Config
export class BinaryDataConfig {
	/** Signing key for binary files */
	@Env('N8N_BINARY_DATA_SIGNING_SECRET')
	signingSecret: string = '';
}
