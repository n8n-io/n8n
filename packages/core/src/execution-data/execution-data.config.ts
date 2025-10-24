import { Config, Env } from '@n8n/config';
import { z } from 'zod';

const executionDataModesSchema = z.enum(['database', 's3']);

@Config
export class ExecutionDataConfig {
	/** Storage mode for execution data. */
	@Env('N8N_EXECUTION_DATA_MODE', executionDataModesSchema)
	mode: z.infer<typeof executionDataModesSchema> = 'database';

	/** S3 bucket name for execution data storage. If not provided, uses the same bucket as binary data with different prefix. */
	@Env('N8N_EXECUTION_DATA_S3_BUCKET_NAME')
	s3BucketName?: string;
}
