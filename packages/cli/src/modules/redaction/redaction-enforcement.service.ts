import { Service } from '@n8n/di';
import type { WorkflowSettings } from 'n8n-workflow';

import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

import { RedactionConfig } from './redaction.config';

/**
 * Reports whether the workflow redaction policy is enforced at the instance level
 * and asserts that incoming updates do not modify the policy when enforcement is on.
 *
 * The current check reads the env feature flag directly. When the enforcement cache
 * lands, this is the single place to swap in the cache lookup so call sites stay
 * unchanged.
 */
@Service()
export class RedactionEnforcementService {
	constructor(private readonly config: RedactionConfig) {}

	isEnforced(): boolean {
		return this.config.enforcement;
	}

	assertPolicyChangeAllowed(
		currentPolicy: WorkflowSettings.RedactionPolicy | undefined,
		incomingPolicy: WorkflowSettings.RedactionPolicy | undefined,
	): void {
		if (!this.isEnforced()) return;
		if (incomingPolicy === undefined) return;
		if (incomingPolicy === currentPolicy) return;

		throw new UnprocessableRequestError(
			'Workflow redaction policy is enforced at the instance level and cannot be modified.',
		);
	}
}
