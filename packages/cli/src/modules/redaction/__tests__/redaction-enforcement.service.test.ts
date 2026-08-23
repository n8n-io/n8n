import type { RedactionFloor } from '@n8n/api-types';
import type { WorkflowSettings } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

import type { InstanceRedactionEnforcementService } from '../instance-redaction-enforcement.service';
import { RedactionEnforcementService } from '../redaction-enforcement.service';

describe('RedactionEnforcementService', () => {
	function createService(floor: RedactionFloor) {
		const instanceRedactionEnforcementService = mock<InstanceRedactionEnforcementService>();
		instanceRedactionEnforcementService.get.mockResolvedValue(floor);
		return new RedactionEnforcementService(instanceRedactionEnforcementService);
	}

	describe('assertPolicyChangeAllowed()', () => {
		test('allows when incoming policy is undefined (field not in payload)', async () => {
			const service = createService('all');
			await expect(service.assertPolicyChangeAllowed('none', undefined)).resolves.toBeUndefined();
		});

		test('allows when incoming policy matches current policy (preserves legacy below-floor state)', async () => {
			const service = createService('all');
			await expect(service.assertPolicyChangeAllowed('none', 'none')).resolves.toBeUndefined();
		});

		describe('floor=off', () => {
			test.each<WorkflowSettings.RedactionPolicy>(['none', 'manual-only', 'non-manual', 'all'])(
				'allows any change to %s',
				async (incoming) => {
					const service = createService('off');
					await expect(service.assertPolicyChangeAllowed('all', incoming)).resolves.toBeUndefined();
				},
			);
		});

		describe('floor=production', () => {
			test.each<WorkflowSettings.RedactionPolicy>(['non-manual', 'all'])(
				'allows change to %s (meets or exceeds floor)',
				async (incoming) => {
					const service = createService('production');
					await expect(service.assertPolicyChangeAllowed('all', incoming)).resolves.toBeUndefined();
				},
			);

			test.each<WorkflowSettings.RedactionPolicy>(['none', 'manual-only'])(
				'rejects change to %s (does not redact production)',
				async (incoming) => {
					const service = createService('production');
					await expect(service.assertPolicyChangeAllowed('all', incoming)).rejects.toThrow(
						UnprocessableRequestError,
					);
				},
			);
		});

		describe('floor=all', () => {
			test('allows change to all (matches floor)', async () => {
				const service = createService('all');
				await expect(
					service.assertPolicyChangeAllowed('non-manual', 'all'),
				).resolves.toBeUndefined();
			});

			test.each<WorkflowSettings.RedactionPolicy>(['none', 'manual-only', 'non-manual'])(
				'rejects change to %s (does not redact both channels)',
				async (incoming) => {
					const service = createService('all');
					await expect(service.assertPolicyChangeAllowed('all', incoming)).rejects.toThrow(
						UnprocessableRequestError,
					);
				},
			);
		});

		test('error message names the floor as the reason', async () => {
			const service = createService('production');
			await expect(service.assertPolicyChangeAllowed('all', 'none')).rejects.toThrow(
				'Workflow redaction policy cannot be weaker than the instance floor.',
			);
		});

		test('rejects upgrade from undefined current to below-floor incoming', async () => {
			const service = createService('production');
			await expect(service.assertPolicyChangeAllowed(undefined, 'none')).rejects.toThrow(
				UnprocessableRequestError,
			);
		});

		test('allows upgrade from undefined current to meets-floor incoming', async () => {
			const service = createService('production');
			await expect(service.assertPolicyChangeAllowed(undefined, 'all')).resolves.toBeUndefined();
		});
	});

	describe('assertNewPolicyAllowed()', () => {
		test('allows when no policy is supplied (left for the create service to seed)', async () => {
			const service = createService('production');
			await expect(service.assertNewPolicyAllowed(undefined)).resolves.toBeUndefined();
		});

		test.each<WorkflowSettings.RedactionPolicy>(['non-manual', 'all'])(
			'allows %s which meets the production floor',
			async (incoming) => {
				const service = createService('production');
				await expect(service.assertNewPolicyAllowed(incoming)).resolves.toBeUndefined();
			},
		);

		test.each<WorkflowSettings.RedactionPolicy>(['none', 'manual-only'])(
			'rejects %s which is weaker than the production floor',
			async (incoming) => {
				const service = createService('production');
				await expect(service.assertNewPolicyAllowed(incoming)).rejects.toThrow(
					UnprocessableRequestError,
				);
			},
		);

		test('allows a below-floor policy when the floor is off', async () => {
			const service = createService('off');
			await expect(service.assertNewPolicyAllowed('none')).resolves.toBeUndefined();
		});

		test('error message names the floor as the reason', async () => {
			const service = createService('production');
			await expect(service.assertNewPolicyAllowed('none')).rejects.toThrow(
				'Workflow redaction policy cannot be weaker than the instance floor.',
			);
		});
	});
});
