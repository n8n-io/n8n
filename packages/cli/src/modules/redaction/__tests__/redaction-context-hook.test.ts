import type { RedactionFloor } from '@n8n/api-types';
import type { ContextEstablishmentOptions } from '@n8n/decorators';
import type { Workflow, WorkflowSettings } from 'n8n-workflow';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

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

	const expectChannels = (
		production: boolean,
		manual: boolean,
		source: 'workflow' | 'instance' = 'workflow',
	) => ({
		contextUpdate: { redaction: { version: 2, production, manual, source } },
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

		it('upgrades a legacy manual-only workflow to redact both channels (safety net)', async () => {
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

			expect(result).toEqual(expectChannels(true, false, 'instance'));
		});

		it('preserves a stricter workflow policy that also redacts manual', async () => {
			setFloor('production');

			const result = await hook.execute(buildOptions('all'));

			expect(result).toEqual(expectChannels(true, true, 'workflow'));
		});

		it('stays production-only when workflow matches the floor', async () => {
			setFloor('production');

			const result = await hook.execute(buildOptions('non-manual'));

			expect(result).toEqual(expectChannels(true, false, 'workflow'));
		});
	});

	describe("floor 'all' — both channels enforced regardless of workflow", () => {
		it.each([
			['none', 'instance'],
			['non-manual', 'instance'],
			['manual-only', 'instance'],
			['all', 'workflow'],
			[undefined, 'instance'],
		] as const)(
			'redacts both channels for workflow policy %s (source: %s)',
			async (policy, source) => {
				setFloor('all');

				const result = await hook.execute(buildOptions(policy));

				expect(result).toEqual(expectChannels(true, true, source));
			},
		);
	});

	describe("source attribution: 'instance' only when the floor adds redaction the workflow did not ask for", () => {
		it("attributes 'workflow' when floor is off", async () => {
			setFloor('off');

			const result = await hook.execute(buildOptions('none'));

			expect(result.contextUpdate!.redaction).toMatchObject({ source: 'workflow' });
		});

		it("attributes 'instance' when floor adds production the workflow did not", async () => {
			setFloor('production');

			const result = await hook.execute(buildOptions('none'));

			expect(result.contextUpdate!.redaction).toMatchObject({ source: 'instance' });
		});

		it("attributes 'workflow' when the workflow already redacts the floor's channel", async () => {
			setFloor('production');

			const result = await hook.execute(buildOptions('non-manual'));

			expect(result.contextUpdate!.redaction).toMatchObject({ source: 'workflow' });
		});

		it("attributes 'workflow' when the workflow exceeds the floor", async () => {
			setFloor('production');

			const result = await hook.execute(buildOptions('all'));

			expect(result.contextUpdate!.redaction).toMatchObject({ source: 'workflow' });
		});

		it("attributes 'instance' when floor='all' raises an off workflow", async () => {
			setFloor('all');

			const result = await hook.execute(buildOptions('none'));

			expect(result.contextUpdate!.redaction).toMatchObject({ source: 'instance' });
		});

		it("attributes 'workflow' for a manual-only workflow when floor is off (the legacy safety upgrade is workflow-side, not floor-side)", async () => {
			setFloor('off');

			const result = await hook.execute(buildOptions('manual-only'));

			expect(result.contextUpdate!.redaction).toMatchObject({ source: 'workflow' });
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
