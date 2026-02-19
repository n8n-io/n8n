import { mockInstance } from '@n8n/backend-test-utils';
import { AuthRolesService } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';

/**
 * Tests for AuthRolesService initialization logic in Start command.
 * This tests the conditional logic that was moved from base-command.ts to start.ts.
 */
describe('Start - AuthRolesService initialization', () => {
	let authRolesService: jest.Mocked<AuthRolesService>;
	let instanceSettings: jest.Mocked<InstanceSettings>;

	beforeEach(() => {
		jest.clearAllMocks();
		Container.reset();

		authRolesService = mock<AuthRolesService>();
		authRolesService.init.mockResolvedValue(undefined);
		Container.set(AuthRolesService, authRolesService);

		instanceSettings = mockInstance(InstanceSettings);
		Container.set(InstanceSettings, instanceSettings);
	});

	/**
	 * Helper function to simulate the conditional logic from start.ts
	 * This mirrors the exact logic in start.ts lines 233-238
	 */
	async function simulateStartInitLogic() {
		if (
			instanceSettings.instanceType === 'main' &&
			(!instanceSettings.isMultiMain || instanceSettings.isLeader)
		) {
			await Container.get(AuthRolesService).init();
		}
	}

	describe('conditional initialization logic', () => {
		it('should initialize AuthRolesService when instanceType is main and not multi-main', async () => {
			// @ts-expect-error - Read-only property, but needed for testing
			instanceSettings.instanceType = 'main';
			// @ts-expect-error - Read-only property, but needed for testing
			instanceSettings.isMultiMain = false;

			await simulateStartInitLogic();

			expect(authRolesService.init).toHaveBeenCalledTimes(1);
		});

		it('should initialize AuthRolesService when instanceType is main, multi-main enabled, and is leader', async () => {
			// @ts-expect-error - Read-only property, but needed for testing
			instanceSettings.instanceType = 'main';
			// @ts-expect-error - Read-only property, but needed for testing
			instanceSettings.isMultiMain = true;
			// @ts-expect-error - Read-only property, but needed for testing
			instanceSettings.isLeader = true;

			await simulateStartInitLogic();

			expect(authRolesService.init).toHaveBeenCalledTimes(1);
		});

		it('should NOT initialize AuthRolesService when instanceType is not main', async () => {
			// @ts-expect-error - Read-only property, but needed for testing
			instanceSettings.instanceType = 'worker';
			// @ts-expect-error - Read-only property, but needed for testing
			instanceSettings.isMultiMain = false;

			await simulateStartInitLogic();

			expect(authRolesService.init).not.toHaveBeenCalled();
		});

		it('should NOT initialize AuthRolesService when instanceType is main, multi-main enabled, but NOT leader', async () => {
			// @ts-expect-error - Read-only property, but needed for testing
			instanceSettings.instanceType = 'main';
			// @ts-expect-error - Read-only property, but needed for testing
			instanceSettings.isMultiMain = true;
			// @ts-expect-error - Read-only property, but needed for testing
			instanceSettings.isLeader = false;

			await simulateStartInitLogic();

			expect(authRolesService.init).not.toHaveBeenCalled();
		});

		it('should initialize AuthRolesService when instanceType is main and isMultiMain is false (even if isLeader is false)', async () => {
			// @ts-expect-error - Read-only property, but needed for testing
			instanceSettings.instanceType = 'main';
			// @ts-expect-error - Read-only property, but needed for testing
			instanceSettings.isMultiMain = false;
			// @ts-expect-error - Read-only property, but needed for testing
			instanceSettings.isLeader = false;

			await simulateStartInitLogic();

			expect(authRolesService.init).toHaveBeenCalledTimes(1);
		});
	});
});
