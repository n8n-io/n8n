import { Config, Env } from '@n8n/config';
import { z } from 'zod';

const executionDataModesSchema = z.enum(['database', 's3']);

@Config
export class ExecutionDataConfig {
	/** Storage mode for execution data. */
	@Env('N8N_EXECUTION_DATA_MODE', executionDataModesSchema)
	mode: z.infer<typeof executionDataModesSchema> = 'database';
}
