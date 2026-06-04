import { Service } from '@n8n/di';
import type { WorkflowSettings } from 'n8n-workflow';

import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

import { InstanceRedactionEnforcementService } from './instance-redaction-enforcement.service';
import { policyMeetsFloor, REDACTION_FLOOR_VIOLATION_MESSAGE } from './redaction-policy';

/**
 * Reports the active instance redaction floor and asserts that incoming
 * workflow updates do not weaken the policy below it.
 *
 * Progressive restriction model: workflows may match or exceed the floor;
 * changes that would drop the policy below the floor are rejected with 422.
 * Pre-existing below-floor state is preserved (no retroactive application) —
 * an update only fails when the *incoming* policy violates the floor.
 */
@Service()
export class RedactionEnforcementService {
	constructor(
		private readonly instanceRedactionEnforcementService: InstanceRedactionEnforcementService,
	) {}

	async assertPolicyChangeAllowed(
		currentPolicy: WorkflowSettings.RedactionPolicy | undefined,
		incomingPolicy: WorkflowSettings.RedactionPolicy | undefined,
	): Promise<void> {
		// Field absent from payload: nothing to validate.
		if (incomingPolicy === undefined) return;
		// Unchanged: preserve legacy below-floor state (no retroactive application).
		if (incomingPolicy === currentPolicy) return;

		// The floor is stored as the enum directly, so no translation is needed.
		const floor = await this.instanceRedactionEnforcementService.get();
		if (!policyMeetsFloor(incomingPolicy, floor)) {
			throw new UnprocessableRequestError(REDACTION_FLOOR_VIOLATION_MESSAGE);
		}
	}
}
