import type { RedactionFloor } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { WorkflowSettings } from 'n8n-workflow';

import { settingsToFloor } from '@/controllers/redaction-enforcement-mapper';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

import { InstanceRedactionEnforcementService } from './instance-redaction-enforcement.service';

const POLICY_SCOPE: Record<
	WorkflowSettings.RedactionPolicy,
	{ production: boolean; manual: boolean }
> = {
	none: { production: false, manual: false },
	'manual-only': { production: false, manual: true },
	'non-manual': { production: true, manual: false },
	all: { production: true, manual: true },
};

const FLOOR_REQUIREMENTS: Record<RedactionFloor, { production: boolean; manual: boolean }> = {
	off: { production: false, manual: false },
	production: { production: true, manual: false },
	all: { production: true, manual: true },
};

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

	async getFloor(): Promise<RedactionFloor> {
		const settings = await this.instanceRedactionEnforcementService.get();
		return settingsToFloor(settings);
	}

	async assertPolicyChangeAllowed(
		currentPolicy: WorkflowSettings.RedactionPolicy | undefined,
		incomingPolicy: WorkflowSettings.RedactionPolicy | undefined,
	): Promise<void> {
		// Field absent from payload: nothing to validate.
		if (incomingPolicy === undefined) return;
		// Unchanged: preserve legacy below-floor state (no retroactive application).
		if (incomingPolicy === currentPolicy) return;

		const floor = await this.getFloor();
		if (floor === 'off') return;

		this.assertMeetsFloor(incomingPolicy, floor);
	}

	assertMeetsFloor(policy: WorkflowSettings.RedactionPolicy, floor: RedactionFloor): void {
		const required = FLOOR_REQUIREMENTS[floor];
		const scope = POLICY_SCOPE[policy];

		const weakerThanFloor =
			(required.production && !scope.production) || (required.manual && !scope.manual);

		if (weakerThanFloor) {
			throw new UnprocessableRequestError(
				'Workflow redaction policy cannot be weaker than the instance floor.',
			);
		}
	}
}
