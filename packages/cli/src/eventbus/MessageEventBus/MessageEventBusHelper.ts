import config from '@/config';
import { getLicense } from '@/License';

export function isLogStreamingEnabled(): boolean {
	const license = getLicense();
	return config.getEnv('enterprise.features.logStreaming') || license.isLogStreamingEnabled();
}
