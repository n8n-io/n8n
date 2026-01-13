import type { Database } from '@/app/workers/database';

export interface WorkerState {
	initialized: boolean;
	database: Database | undefined;
	baseUrl: string;
}
