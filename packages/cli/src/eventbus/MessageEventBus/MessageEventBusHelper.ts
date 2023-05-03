import { License } from '@/License';
import { Container } from 'typedi';

export function isLogStreamingEnabled(): boolean {
	const license = Container.get(License);
	return license.isLogStreamingEnabled();
}
