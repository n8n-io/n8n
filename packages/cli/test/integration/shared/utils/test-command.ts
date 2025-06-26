import { testDb } from '@n8n/backend-test-utils';
import { mockInstance } from '@n8n/backend-test-utils';
import type { Config } from '@oclif/core';
import { mock } from 'jest-mock-extended';
import type { Class } from 'n8n-core';

import type { BaseCommand } from '@/commands/base-command';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';

mockInstance(MessageEventBus);

export const setupTestCommand = <T extends BaseCommand>(Command: Class<T>) => {
	const config = mock<Config>();
	config.runHook.mockResolvedValue({ successes: [], failures: [] });

	// mock SIGINT/SIGTERM registration
	process.once = jest.fn();
	process.exit = jest.fn() as never;

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(() => {
		jest.clearAllMocks();
		mockInstance(TelemetryEventRelay);
	});

	afterAll(async () => {
		await testDb.terminate();

		jest.restoreAllMocks();
	});

	const run = async (argv: string[] = []) => {
		const command = new Command(argv, config);
		await command.init();
		await command.run();
		return command;
	};

	return { run };
};
