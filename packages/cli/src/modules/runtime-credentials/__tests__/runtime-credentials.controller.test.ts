import type { ModuleRegistry } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest } from '@n8n/db';
import { BadRequestError, UserError } from '@n8n/errors';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { RuntimeCredentialsController } from '../runtime-credentials.controller';
import type { RuntimeCredentialsImpactService } from '../runtime-credentials-impact.service';
import type { RuntimeCredentialsService } from '../runtime-credentials.service';

describe('RuntimeCredentialsController', () => {
	const service = mock<RuntimeCredentialsService>();
	const moduleRegistry = mock<ModuleRegistry>();
	const logger = mockLogger();
	const controller = new RuntimeCredentialsController(
		service,
		mock<RuntimeCredentialsImpactService>(),
		moduleRegistry,
		logger,
	);
	const rule = { alias: 'tenant_key', nodeType: '*', path: 'headers.x-tenant-key' };

	beforeEach(() => {
		vi.resetAllMocks();
		service.getRules.mockReturnValue([{ ...rule, source: 'settings' }]);
	});

	it('saves the rules, refreshes the module settings and returns every rule', async () => {
		const result = await controller.updateRules(mock<AuthenticatedRequest>(), mock<Response>(), {
			rules: [rule],
		});

		expect(service.saveRules).toHaveBeenCalledWith([rule]);
		expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('runtime-credentials');
		expect(result).toEqual({ rules: [{ ...rule, source: 'settings' }] });
	});

	it('returns the saved rules and logs when the module settings cannot be refreshed', async () => {
		moduleRegistry.refreshModuleSettings.mockRejectedValueOnce(new Error('pubsub down'));

		const result = await controller.updateRules(mock<AuthenticatedRequest>(), mock<Response>(), {
			rules: [rule],
		});

		expect(result).toEqual({ rules: [{ ...rule, source: 'settings' }] });
		expect(logger.error).toHaveBeenCalled();
	});

	it('turns a validation error into a bad request', async () => {
		service.saveRules.mockRejectedValue(
			new UserError('The alias "x" is used by more than one rule'),
		);

		await expect(
			controller.updateRules(mock<AuthenticatedRequest>(), mock<Response>(), { rules: [rule] }),
		).rejects.toThrow(BadRequestError);
		expect(moduleRegistry.refreshModuleSettings).not.toHaveBeenCalled();
	});
});
