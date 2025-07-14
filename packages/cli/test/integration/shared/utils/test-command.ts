import { testDb, mockInstance } from '@n8n/backend-test-utils';
import type { CommandClass } from '@n8n/decorators';
import argvParser from 'yargs-parser';

import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';

mockInstance(MessageEventBus);

export const setupTestCommand = <T extends CommandClass>(Command: T) => {
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
		const command = new Command();
		command.flags = argvParser(argv);
		await command.init?.();
		await command.run();
		return command;
	};

	return { run };
};
