import { Config, Env, Nested } from '@n8n/config';
import { z } from 'zod';

const protocolSchema = z.enum(['http', 'https']);

export type Protocol = z.infer<typeof protocolSchema>;

@Config
class ObjectStoreBucketConfig {
	/** Name of the n8n bucket in S3-compatible external storage */
	@Env('N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME')
	name: string = '';

	/** Region of the n8n bucket in S3-compatible external storage @example "us-east-1" */
	@Env('N8N_EXTERNAL_STORAGE_S3_BUCKET_REGION')
	region: string = '';
}

@Config
class ObjectStoreCredentialsConfig {
	/** Access key in S3-compatible external storage */
	@Env('N8N_EXTERNAL_STORAGE_S3_ACCESS_KEY')
	accessKey: string = '';

	/** Access secret in S3-compatible external storage */
	@Env('N8N_EXTERNAL_STORAGE_S3_ACCESS_SECRET')
	accessSecret: string = '';

	/**
	 * Use automatic credential detection to authenticate S3 calls for external storage
	 * This will ignore accessKey/accessSecret and use the default credential provider chain
	 * https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html#credchain
	 */
	@Env('N8N_EXTERNAL_STORAGE_S3_AUTH_AUTO_DETECT')
	authAutoDetect: boolean = false;
}

@Config
export class ObjectStoreConfig {
	/**
	 * Host of the object-store bucket in S3-compatible external storage
	 * @example "s3.us-east-1.amazonaws.com"
	 **/
	@Env('N8N_EXTERNAL_STORAGE_S3_HOST')
	host: string = '';

	@Env('N8N_EXTERNAL_STORAGE_S3_PROTOCOL', protocolSchema)
	protocol: Protocol = 'https';

	@Nested
	bucket: ObjectStoreBucketConfig = {} as ObjectStoreBucketConfig;

	@Nested
	credentials: ObjectStoreCredentialsConfig = {} as ObjectStoreCredentialsConfig;
}
