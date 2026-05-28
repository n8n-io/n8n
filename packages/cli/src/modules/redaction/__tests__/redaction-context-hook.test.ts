import type { RedactionEnforcementSettings } from '@n8n/api-types';
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

	const setEnforcement = (enforcement: RedactionEnforcementSettings | undefined) => {
		service.buildContext.mockResolvedValue(enforcement ? { enforcement } : undefined);
	};

	beforeEach(() => {
		service = mock<InstanceRedactionEnforcementService>();
		hook = new RedactionContextHook(service);
	});

	describe('when enforcement is active', () => {
		it('emits "all" when manual:true production:true', async () => {
			setEnforcement({ enforced: true, manual: true, production: true });

			const result = await hook.execute(buildOptions('none'));

			expect(result).toEqual({
				contextUpdate: { redaction: { version: 1, policy: 'all' } },
			});
		});

		it('emits "non-manual" when manual:false production:true', async () => {
			setEnforcement({ enforced: true, manual: false, production: true });

			const result = await hook.execute(buildOptions('none'));

			expect(result).toEqual({
				contextUpdate: { redaction: { version: 1, policy: 'non-manual' } },
			});
		});

		it('emits "manual-only" when manual:true production:false', async () => {
			setEnforcement({ enforced: true, manual: true, production: false });

			const result = await hook.execute(buildOptions('all'));

			expect(result).toEqual({
				contextUpdate: { redaction: { version: 1, policy: 'manual-only' } },
			});
		});

		it('emits "none" when manual:false production:false', async () => {
			setEnforcement({ enforced: true, manual: false, production: false });

			const result = await hook.execute(buildOptions('all'));

			expect(result).toEqual({
				contextUpdate: { redaction: { version: 1, policy: 'none' } },
			});
		});

		it('overrides the workflow-configured policy', async () => {
			setEnforcement({ enforced: true, manual: true, production: true });

			const result = await hook.execute(buildOptions('non-manual'));

			expect(result).toEqual({
				contextUpdate: { redaction: { version: 1, policy: 'all' } },
			});
		});
	});

	describe('when enforcement is inactive', () => {
		it('falls back to workflow.settings.redactionPolicy when enforced:false', async () => {
			setEnforcement({ enforced: false, manual: true, production: true });

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
