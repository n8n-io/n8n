import type { RedactionEnforcementSettings } from '@n8n/api-types';
import type { ContextEstablishmentOptions } from '@n8n/decorators';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { InstanceRedactionEnforcementService } from '../instance-redaction-enforcement.service';
import { RedactionContextHook } from '../redaction-context-hook';

describe('RedactionContextHook', () => {
	let service: MockProxy<InstanceRedactionEnforcementService>;
	let hook: RedactionContextHook;

	const buildOptions = (): ContextEstablishmentOptions => mock<ContextEstablishmentOptions>();

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

			const result = await hook.execute(buildOptions());

			expect(result).toEqual({
				contextUpdate: { redaction: { version: 1, policy: 'all' } },
			});
		});

		it('emits "non-manual" when manual:false production:true', async () => {
			setEnforcement({ enforced: true, manual: false, production: true });

			const result = await hook.execute(buildOptions());

			expect(result).toEqual({
				contextUpdate: { redaction: { version: 1, policy: 'non-manual' } },
			});
		});

		it('emits "manual-only" when manual:true production:false', async () => {
			setEnforcement({ enforced: true, manual: true, production: false });

			const result = await hook.execute(buildOptions());

			expect(result).toEqual({
				contextUpdate: { redaction: { version: 1, policy: 'manual-only' } },
			});
		});

		it('emits "none" when manual:false production:false', async () => {
			setEnforcement({ enforced: true, manual: false, production: false });

			const result = await hook.execute(buildOptions());

			expect(result).toEqual({
				contextUpdate: { redaction: { version: 1, policy: 'none' } },
			});
		});
	});

	describe('when enforcement is inactive', () => {
		it('omits contextUpdate when enforced:false (defaults preserved)', async () => {
			setEnforcement({ enforced: false, manual: true, production: true });

			const result = await hook.execute(buildOptions());

			expect(result).toEqual({});
			expect(result.contextUpdate).toBeUndefined();
		});

		it('omits contextUpdate when buildContext returns undefined (feature flag off)', async () => {
			setEnforcement(undefined);

			const result = await hook.execute(buildOptions());

			expect(result).toEqual({});
			expect(result.contextUpdate).toBeUndefined();
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
