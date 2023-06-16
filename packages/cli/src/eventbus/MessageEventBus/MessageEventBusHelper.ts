import { License } from '@/License';
import { Container } from 'typedi';

export const EVENT_BUS_REDIS_CHANNEL = 'n8n.events';

export function isLogStreamingEnabled(): boolean {
	const license = Container.get(License);
	return license.isLogStreamingEnabled();
}
