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

	const setFloor = (floor: RedactionFloor) => {
		service.get.mockResolvedValue(floor);
	};

	const expectChannels = (production: boolean, manual: boolean) => ({
		contextUpdate: { redaction: { version: 2, production, manual } },
	});

	beforeEach(() => {
		service = mock<InstanceRedactionEnforcementService>();
		hook = new RedactionContextHook(service);
	});

	describe("floor 'off' — workflow setting applies", () => {
		it.each([
			['none', false, false],
			['non-manual', true, false],
			['all', true, true],
		] as const)('policy %s → production:%s manual:%s', async (policy, production, manual) => {
			setFloor('off');

			const result = await hook.execute(buildOptions(policy));

			expect(result).toEqual(expectChannels(production, manual));
		});

		it('clamps a manual-only workflow policy up to production+manual', async () => {
			setFloor('off');

			const result = await hook.execute(buildOptions('manual-only'));

			expect(result).toEqual(expectChannels(true, true));
		});

		it('defaults to no redaction when workflow has no policy', async () => {
			setFloor('off');

			const result = await hook.execute(buildOptions(undefined));

			expect(result).toEqual(expectChannels(false, false));
		});
	});

	describe("floor 'production' — production is the minimum", () => {
		it('redacts production but not manual when workflow has no policy', async () => {
			setFloor('production');

			const result = await hook.execute(buildOptions('none'));

			expect(result).toEqual(expectChannels(true, false));
		});

		it('preserves a stricter workflow policy that also redacts manual', async () => {
			setFloor('production');

			const result = await hook.execute(buildOptions('all'));

			expect(result).toEqual(expectChannels(true, true));
		});

		it('stays production-only when workflow matches the floor', async () => {
			setFloor('production');

			const result = await hook.execute(buildOptions('non-manual'));

			expect(result).toEqual(expectChannels(true, false));
		});
	});

	describe("floor 'all' — both channels enforced regardless of workflow", () => {
		it.each(['none', 'non-manual', 'manual-only', 'all', undefined] as const)(
			'redacts both channels for workflow policy %s',
			async (policy) => {
				setFloor('all');

				const result = await hook.execute(buildOptions(policy));

				expect(result).toEqual(expectChannels(true, true));
			},
		);
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
