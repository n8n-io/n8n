import { AGENT_QUEUE_DISPATCH_CAPABILITY, type InstanceRegistration } from '@n8n/api-types';
import {
	ClusterCheck,
	type ClusterCheckContext,
	type ClusterCheckResult,
	type IClusterCheck,
} from '@n8n/decorators';

import { buildCheckResult } from './build-check-result';

const CHECK_CODE = 'cluster.agent-queue-mode-mismatch';
const AUDIT_DETECTED = 'n8n.audit.cluster.agent-queue-mode-mismatch.detected';
const AUDIT_RESOLVED = 'n8n.audit.cluster.agent-queue-mode-mismatch.resolved';

function mainsByFlag(instances: Iterable<InstanceRegistration>) {
	const enabled: string[] = [];
	const disabled: string[] = [];
	for (const instance of instances) {
		if (instance.instanceType !== 'main') continue;
		const list = instance.capabilities?.includes(AGENT_QUEUE_DISPATCH_CAPABILITY)
			? enabled
			: disabled;
		list.push(instance.hostId);
	}
	enabled.sort();
	disabled.sort();
	return { enabled, disabled, mismatch: enabled.length > 0 && disabled.length > 0 };
}

/**
 * Mains that disagree on agent queue mode split one conversation across two
 * dispatch rules: one main sends a turn to a worker while another main runs
 * the next turn itself. Report it, so the operator can align the setting.
 */
@ClusterCheck()
export class AgentQueueModeCheck implements IClusterCheck {
	checkDescription = {
		name: 'agent-queue-mode-mismatch',
		displayName: 'Agent queue mode mismatch',
	};

	async run(context: ClusterCheckContext): Promise<ClusterCheckResult> {
		const current = mainsByFlag(context.currentState.values());
		const previous = mainsByFlag(context.previousState.values());

		return buildCheckResult({
			hasProblem: current.mismatch,
			hadProblem: previous.mismatch,
			fingerprint: current.mismatch ? current.enabled.join('|') : '',
			previousFingerprint: previous.mismatch ? previous.enabled.join('|') : '',
			code: CHECK_CODE,
			severity: 'error',
			message:
				'Main instances use different values for N8N_AGENTS_QUEUE_MODE_ENABLED. Set the same value on every main instance.',
			context: { enabledOn: current.enabled, disabledOn: current.disabled },
			auditDetected: AUDIT_DETECTED,
			auditResolved: AUDIT_RESOLVED,
		});
	}
}
