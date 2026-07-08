import type { UpdateSecuritySettingsDto } from '@n8n/api-types';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { LicenseState } from '@n8n/backend-common';
import type { EventService } from '@/events/event.service';
import type { InstanceRedactionEnforcementService } from '@/modules/redaction/instance-redaction-enforcement.service';
import type { SecuritySettingsService } from '@/services/security-settings.service';
import type { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';

import { SecuritySettingsController } from '../security-settings.controller';

describe('SecuritySettingsController', () => {
	const securitySettingsService = mock<SecuritySettingsService>();
	const workflowReviewPolicyService = mock<WorkflowReviewPolicyService>();
	const licenseState = mock<LicenseState>();
	const eventService = mock<EventService>();
	const instanceSettingsLoaderConfig = mock<InstanceSettingsLoaderConfig>({
		securityPolicyManagedByEnv: false,
	});
	const instanceRedactionEnforcementService = mock<InstanceRedactionEnforcementService>();

	const controller = new SecuritySettingsController(
		securitySettingsService,
		workflowReviewPolicyService,
		licenseState,
		eventService,
		instanceSettingsLoaderConfig,
		instanceRedactionEnforcementService,
	);

	const req = mock<AuthenticatedRequest>({
		user: { id: 'user-1', email: 'admin@n8n.io', firstName: 'Admin', lastName: 'User' },
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	const redactionPolicyEvents = () =>
		eventService.emit.mock.calls.filter(
			([name, payload]) =>
				name === 'instance-policies-updated' &&
				typeof payload === 'object' &&
				payload !== null &&
				'settingName' in payload &&
				String(payload.settingName).startsWith('data_redaction'),
		);

	const dto = (floor: 'off' | 'production' | 'all') =>
		({ redactionEnforcement: { floor } }) as UpdateSecuritySettingsDto;

	describe('updateSecuritySettings — redaction telemetry', () => {
		it('emits the redaction floor when enforcement is enabled', async () => {
			instanceRedactionEnforcementService.get.mockResolvedValue('off');

			await controller.updateSecuritySettings(req, mock(), dto('all'));

			expect(instanceRedactionEnforcementService.set).toHaveBeenCalledWith('all');
			expect(eventService.emit).toHaveBeenCalledWith(
				'redaction-enforcement-updated',
				expect.anything(),
			);
			expect(redactionPolicyEvents()).toEqual([
				[
					'instance-policies-updated',
					expect.objectContaining({
						settingName: 'data_redaction_enforcement_floor',
						value: 'all',
					}),
				],
			]);
		});

		it('reports the production-only floor as `production`', async () => {
			instanceRedactionEnforcementService.get.mockResolvedValue('off');

			await controller.updateSecuritySettings(req, mock(), dto('production'));

			expect(instanceRedactionEnforcementService.set).toHaveBeenCalledWith('production');
			expect(redactionPolicyEvents().map(([, payload]) => payload)).toEqual([
				expect.objectContaining({
					settingName: 'data_redaction_enforcement_floor',
					value: 'production',
				}),
			]);
		});

		it('reports `off` when enforcement is disabled', async () => {
			instanceRedactionEnforcementService.get.mockResolvedValue('production');

			await controller.updateSecuritySettings(req, mock(), dto('off'));

			expect(instanceRedactionEnforcementService.set).toHaveBeenCalledWith('off');
			expect(redactionPolicyEvents().map(([, payload]) => payload)).toEqual([
				expect.objectContaining({
					settingName: 'data_redaction_enforcement_floor',
					value: 'off',
				}),
			]);
		});

		it('emits nothing when the floor is unchanged', async () => {
			instanceRedactionEnforcementService.get.mockResolvedValue('production');

			await controller.updateSecuritySettings(req, mock(), dto('production'));

			expect(instanceRedactionEnforcementService.set).not.toHaveBeenCalled();
			expect(redactionPolicyEvents()).toHaveLength(0);
		});

		it('does not persist or emit when the redaction floor is unchanged', async () => {
			instanceRedactionEnforcementService.get.mockResolvedValue('all');

			const result = await controller.updateSecuritySettings(req, mock(), dto('all'));

			expect(instanceRedactionEnforcementService.set).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalledWith(
				'redaction-enforcement-updated',
				expect.anything(),
			);
			expect(redactionPolicyEvents()).toHaveLength(0);
			expect(result.redactionEnforcement).toEqual({ floor: 'all' });
		});
	});
});
