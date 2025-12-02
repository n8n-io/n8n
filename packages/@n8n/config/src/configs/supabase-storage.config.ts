import { Config, Env } from '../decorators';

@Config
export class SupabaseStorageConfig {
	/** Supabase project URL */
	@Env('SUPABASE_URL')
	url: string = '';

	/** Supabase service role key for server-side operations */
	@Env('SUPABASE_SERVICE_ROLE_KEY')
	serviceRoleKey: string = '';

	/** Maximum file size for data table file uploads (in bytes) */
	@Env('N8N_DATA_TABLE_MAX_FILE_SIZE_BYTES')
	maxFileSize: number = 50 * 1024 * 1024; // 50MB default

	/** Whether to enable Supabase storage for data table files */
	@Env('N8N_DATA_TABLE_FILES_ENABLED')
	enabled: boolean = false;
}
