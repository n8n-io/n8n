import type { LogMetadata } from 'n8n-workflow';

export interface ITraceable {
	asLogMetadata(): LogMetadata;
}
