import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { createHmac } from 'node:crypto';

/**
 * Derives deterministic target-side IDs from (projectId, sourceId) pairs.
 *
 * Same inputs on the same instance always produce the same output, so
 * re-importing a package upserts cleanly. Different instances produce
 * different outputs because the HMAC is keyed on the instance encryption
 * key, which closes the cross-instance ID-squatting risk where a project
 * member could pre-create an entity at a predictable target ID to be
 * silently overwritten on a future import.
 */
@Service()
export class IdDeriver {
	constructor(private readonly instanceSettings: InstanceSettings) {}

	derive(projectId: string, sourceId: string): string {
		const hmac = createHmac('sha256', this.instanceSettings.encryptionKey);
		hmac.update(`${projectId}:${sourceId}`);
		return `${projectId}-${hmac.digest('hex').slice(0, 16)}`;
	}
}
