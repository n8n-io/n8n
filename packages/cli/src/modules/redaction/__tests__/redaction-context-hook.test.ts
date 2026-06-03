import type { RedactionFloor } from '@n8n/api-types';
import type { ContextEstablishmentOptions } from '@n8n/decorators';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { Workflow, WorkflowSettings } from 'n8n-workflow';

import type { InstanceRedactionEnforcementService } from '../instance-redaction-enforcement.service';
import { RedactionContextHook } from '../redaction-context-hook';

describe('RedactionContextHook', () => {
	let service: MockProxy<InstanceRedactionEnforcementService>;
	let hook: RedactionContextHook;

	const buildOptions = (
		workflowRedactionPolicy?: WorkflowSettings.RedactionPolicy,
	): ContextEstablishmentOptions =>
		mock<ContextEstablishmentOptions>({
			workflow: mock<Workflow>({
				settings: { redactionPolicy: workflowRedactionPolicy },
			}),
		});

	const setEnforcement = (enforcement: RedactionFloor | undefined) => {
		service.buildContext.mockResolvedValue(enforcement ? { enforcement } : undefined);
	};

	beforeEach(() => {
		service = mock<InstanceRedactionEnforcementService>();
		hook = new RedactionContextHook(service);
	});

	describe('when enforcement is active', () => {
		it('emits "all" when floor is "all"', async () => {
			setEnforcement('all');

			const result = await hook.execute(buildOptions('none'));

			expect(result).toEqual({
				contextUpdate: { redaction: { version: 1, policy: 'all' } },
			});
		});

		it('emits "non-manual" when floor is "production"', async () => {
			setEnforcement('production');

			const result = await hook.execute(buildOptions('none'));

			expect(result).toEqual({
				contextUpdate: { redaction: { version: 1, policy: 'non-manual' } },
			});
		});

		it('overrides the workflow-configured policy', async () => {
			setEnforcement('all');

			const result = await hook.execute(buildOptions('non-manual'));

			expect(result).toEqual({
				contextUpdate: { redaction: { version: 1, policy: 'all' } },
			});
		});
	});

	describe('when enforcement is inactive', () => {
		it('falls back to workflow.settings.redactionPolicy when floor is "off"', async () => {
			setEnforcement('off');

			const result = await hook.execute(buildOptions('non-manual'));

			expect(result).toEqual({
				contextUpdate: { redaction: { version: 1, policy: 'non-manual' } },
			});
		});

		it('falls back to workflow.settings.redactionPolicy when buildContext returns undefined', async () => {
			setEnforcement(undefined);

			const result = await hook.execute(buildOptions('all'));

			expect(result).toEqual({
				contextUpdate: { redaction: { version: 1, policy: 'all' } },
			});
		});

		it('defaults to "none" when workflow has no redactionPolicy setting', async () => {
			setEnforcement(undefined);

			const result = await hook.execute(buildOptions(undefined));

			expect(result).toEqual({
				contextUpdate: { redaction: { version: 1, policy: 'none' } },
			});
		});
	});

	describe('hook metadata', () => {
		it('is named RedactionContextHook', () => {
			expect(hook.hookDescription.name).toBe('RedactionContextHook');
		});

		it('reports isApplicableToTriggerNode === false (global, not user-facing)', () => {
			expect(hook.isApplicableToTriggerNode('n8n-nodes-base.webhook')).toBe(false);
		});
	});
});
