import { z } from 'zod';

import { Config, Env, Nested } from '../decorators';

const protocolSchema = z.enum(['http', 'https']);

export type Protocol = z.infer<typeof protocolSchema>;

@Config
class S3BucketConfig {
	/** Name of the n8n bucket in S3-compatible external storage */
	@Env('N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME')
	name: string = '';

	/** Region of the n8n bucket in S3-compatible external storage @example "us-east-1" */
	@Env('N8N_EXTERNAL_STORAGE_S3_BUCKET_REGION')
	region: string = '';
}

@Config
class S3CredentialsConfig {
	/** Access key in S3-compatible external storage */
	@Env('N8N_EXTERNAL_STORAGE_S3_ACCESS_KEY')
	accessKey: string = '';

	/** Access secret in S3-compatible external storage */
	@Env('N8N_EXTERNAL_STORAGE_S3_ACCESS_SECRET')
	accessSecret: string = '';
}

@Config
export class S3Config {
	/** Host of the n8n bucket in S3-compatible external storage @example "s3.us-east-1.amazonaws.com" */
	@Env('N8N_EXTERNAL_STORAGE_S3_HOST')
	host: string = '';

	@Env('N8N_EXTERNAL_STORAGE_S3_PROTOCOL', protocolSchema)
	protocol: Protocol = 'https';

	@Nested
	bucket: S3BucketConfig;

	@Nested
	credentials: S3CredentialsConfig;
}

@Config
export class ExternalStorageConfig {
	@Nested
	s3: S3Config;
}
