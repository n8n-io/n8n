import { Container } from 'typedi';
import { License } from '@/License';

export function isSharingEnabled(): boolean {
	return Container.get(License).isSharingEnabled();
}
