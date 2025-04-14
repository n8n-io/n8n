import { Config, Env } from '@n8n/config';

@Config
export class BinaryDataConfig {
	/** Secret for creating publicly-accesible signed URLs for binary data */
	@Env('N8N_BINARY_DATA_SIGNING_SECRET')
	signingSecret?: string = undefined;
}
