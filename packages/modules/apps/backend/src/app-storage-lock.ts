import { createHash } from 'node:crypto';

export function appStorageLockSubKey(appId: string): number {
	return createHash('sha256').update(appId).digest().readInt32BE(0);
}
