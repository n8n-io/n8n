import type { InstanceRegistration } from '@n8n/api-types';
import {
	ClusterCheck,
	type ClusterCheckAuditEvent,
	type ClusterCheckContext,
	type ClusterCheckResult,
	type IClusterCheck,
} from '@n8n/decorators';

const AUDIT_JOINED = 'n8n.audit.cluster.instance-joined';
const AUDIT_LEFT = 'n8n.audit.cluster.instance-left';

function membershipPayload(instance: InstanceRegistration): Record<string, unknown> {
	return {
		instanceKey: instance.instanceKey,
		hostId: instance.hostId,
		instanceType: instance.instanceType,
		instanceRole: instance.instanceRole,
		version: instance.version,
	};
}

/**
 * Observability-only check that emits one audit event per instance that
 * joined or left the cluster since the previous reconciliation cycle.
 * Relies on `context.diff` which is pre-computed by the CheckService and
 * already only contains changes between cycles, so no explicit deduplication
 * is needed.
 */
@ClusterCheck()
export class LifecycleCheck implements IClusterCheck {
	checkDescription = {
		name: 'lifecycle',
		displayName: 'Cluster membership',
	};

	async run(context: ClusterCheckContext): Promise<ClusterCheckResult> {
		const auditEvents: ClusterCheckAuditEvent[] = [];

		for (const joined of context.diff.added) {
			auditEvents.push({
				eventName: AUDIT_JOINED,
				payload: membershipPayload(joined),
			});
		}

		for (const left of context.diff.removed) {
			auditEvents.push({
				eventName: AUDIT_LEFT,
				payload: membershipPayload(left),
			});
		}

		if (auditEvents.length === 0) return {};

		return { auditEvents };
	}
}
