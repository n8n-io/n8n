import type { InstanceRegistration } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import type { CheckService } from '../checks/check.service';
import { InstanceRegistryController } from '../instance-registry.controller';
import type { InstanceRegistryService } from '../instance-registry.service';

const makeRegistration = (overrides: Partial<InstanceRegistration> = {}): InstanceRegistration => ({
	schemaVersion: 1,
	instanceKey: 'key-1',
	hostId: 'host-1',
	instanceType: 'main',
	instanceRole: 'leader',
	version: '1.0.0',
	registeredAt: Date.now(),
	lastSeen: Date.now(),
	...overrides,
});

describe('InstanceRegistryController', () => {
	let controller: InstanceRegistryController;
	let service: jest.Mocked<InstanceRegistryService>;
	let checkService: jest.Mocked<CheckService>;

	beforeEach(() => {
		service = mock<InstanceRegistryService>();
		checkService = mock<CheckService>();
		checkService.runChecks.mockResolvedValue({ currentState: new Map(), results: [] });
		controller = new InstanceRegistryController(service, checkService);
	});

	describe('getClusterInfo', () => {
		it('returns instances and an empty check summary when no checks produced results', async () => {
			const instances = [
				makeRegistration({ instanceKey: 'key-1', hostId: 'host-1' }),
				makeRegistration({ instanceKey: 'key-2', hostId: 'host-2', instanceType: 'worker' }),
			];
			service.getAllInstances.mockResolvedValue(instances);

			const result = await controller.getClusterInfo();

			expect(result.instances).toEqual(instances);
			expect(result.checks).toEqual({});
		});

		it('builds a per-check summary from runChecks results (succeeded, warned, and execution-failed)', async () => {
			service.getAllInstances.mockResolvedValue([]);
			checkService.runChecks.mockResolvedValue({
				currentState: new Map(),
				results: [
					{
						checkName: 'cluster.versionMismatch',
						result: {
							warnings: [
								{
									code: 'cluster.versionMismatch',
									message: 'Detected 2 versions',
									severity: 'warning',
									context: { versions: ['1.0.0', '1.1.0'] },
								},
							],
						},
					},
					{
						checkName: 'cluster.quiet',
						result: {},
					},
					{
						checkName: 'cluster.broken',
						failed: true,
					},
				],
			});

			const result = await controller.getClusterInfo();

			expect(result.checks['cluster.versionMismatch']).toMatchObject({
				check: 'cluster.versionMismatch',
				status: 'failed',
				warnings: [
					{
						check: 'cluster.versionMismatch',
						code: 'cluster.versionMismatch',
						message: 'Detected 2 versions',
						severity: 'warning',
						context: { versions: ['1.0.0', '1.1.0'] },
					},
				],
			});
			expect(typeof result.checks['cluster.versionMismatch'].executedAt).toBe('number');

			expect(result.checks['cluster.quiet']).toMatchObject({
				check: 'cluster.quiet',
				status: 'succeeded',
				warnings: [],
			});

			expect(result.checks['cluster.broken']).toMatchObject({
				check: 'cluster.broken',
				status: 'failed',
				warnings: [
					{
						check: 'cluster.broken',
						code: 'cluster.check-execution-failed',
						severity: 'warning',
					},
				],
			});
		});
	});
});
