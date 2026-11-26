import { testDb, mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { CommandMetadata, type CommandClass } from '@n8n/decorators';
import { Container } from '@n8n/di';
import argvParser from 'yargs-parser';

import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';

mockInstance(MessageEventBus);

export const setupTestCommand = <T extends CommandClass>(Command: T) => {
	// mock SIGINT/SIGTERM registration
	process.once = vi.fn();
	process.exit = vi.fn() as never;

	beforeAll(async () => {
		// `BaseCommand.init()` starts the PostHog client when diagnostics are on. Keep it off
		// so a command test reads feature flags from `featureFlags.override` only.
		Container.get(GlobalConfig).diagnostics.enabled = false;
		await testDb.init();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		mockInstance(TelemetryEventRelay);
	});

	afterAll(async () => {
		await testDb.terminate();

		vi.restoreAllMocks();
	});

	const run = async (argv: string[] = []) => {
		const command = new Command();
		const rawFlags = argvParser(argv, { string: ['id'] });
		const entry = Container.get(CommandMetadata)
			.getEntries()
			.find(([, e]) => e.class === Command)?.[1];
		command.flags = entry?.flagsSchema ? entry.flagsSchema.parse(rawFlags) : rawFlags;
		await command.init?.();
		await command.run();
		return command;
	};

	return { run };
};
