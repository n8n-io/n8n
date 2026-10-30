import type { HooksApi, RegisterHooks } from '@n8n/hooks-api';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { ExternalHooks } from '@/external-hooks';

import { HooksApiService } from '../hooks-api.service';
import { PublicHttpService } from '../v1/public-http.service';
import { PublicOwnershipService } from '../v1/public-ownership.service';
import { PublicWorkflowHooksService } from '../v1/public-workflow-hooks.service';
import { PublicWorkflowsService } from '../v1/public-workflows.service';

describe('HooksApiService', () => {
	const ownership = mock<PublicOwnershipService>({ version: 1 });
	const workflows = mock<PublicWorkflowsService>({ version: 1 });
	const workflowHooks = mock<PublicWorkflowHooksService>({ version: 1 });
	const http = mock<PublicHttpService>({ version: 1 });

	const createService = (
		registerFunctions: RegisterHooks[],
		instanceType: InstanceSettings['instanceType'] = 'main',
	) =>
		new HooksApiService(
			mock(),
			mock<ExternalHooks>({ registerFunctions }),
			mock<InstanceSettings>({ instanceType }),
			ownership,
			workflows,
			workflowHooks,
			http,
		);

	it('should pass the V1 API to every register function', async () => {
		const first = vi.fn<RegisterHooks>();
		const second = vi.fn<RegisterHooks>();

		await createService([first, second]).register();

		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);

		const api: HooksApi = first.mock.calls[0][0];
		expect(api.v1).toMatchObject({
			version: 1,
			instance: { type: 'main' },
			ownership,
			workflows,
			http,
			hooks: { workflow: workflowHooks },
		});
	});

	it('should not offer the HTTP API on workers', async () => {
		const register = vi.fn<RegisterHooks>();

		await createService([register], 'worker').register();

		expect(register.mock.calls[0][0].v1?.http).toBeUndefined();
		expect(register.mock.calls[0][0].v1?.instance.type).toBe('worker');
	});

	it('should wrap errors from a register function', async () => {
		const register = vi.fn<RegisterHooks>().mockRejectedValue(new Error('boom'));

		await expect(createService([register]).register()).rejects.toThrow(UnexpectedError);
	});
});
