import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import '@/zod-alias-support';
import { ImportService } from '@/services/import.service';

import { ImportWorkflowsCommand } from '../workflow';

jest.mock('@/services/import.service');

describe('ImportWorkflowsCommand', () => {
	mockInstance(ImportService);

	const globalConfig = Container.get(GlobalConfig);
	const originalMode = globalConfig.executions.mode;

	afterEach(() => {
		globalConfig.executions.mode = originalMode;
	});

	const buildCommand = () => {
		const command = new ImportWorkflowsCommand();
		// @ts-expect-error Protected property
		command.logger = {
			info: jest.fn(),
			error: jest.fn(),
		};
		return command;
	};

	describe('--activeState flag', () => {
		it('throws when n8n is not running in queue mode and activeState is set to "fromJson"', async () => {
			globalConfig.executions.mode = 'regular';

			const command = buildCommand();
			// @ts-expect-error Protected property
			command.flags = {
				input: './workflows.json',
				separate: false,
				activeState: 'fromJson',
			};

			await expect(command.run()).rejects.toThrow(
				'The "--activeState=fromJson" flag can only be used when n8n is running in queue or multi-main mode. In regular deployment mode, workflow activation is not supported.',
			);
		});

		it('does not throw on the queue-mode guard when running in queue mode', async () => {
			globalConfig.executions.mode = 'queue';

			const command = buildCommand();
			// @ts-expect-error Protected property
			command.flags = {
				// `input` intentionally missing so `run` returns early after the guard
				// without us needing to mock filesystem/repositories.
				separate: false,
				activeState: 'fromJson',
			};

			await expect(command.run()).resolves.toBeUndefined();
		});

		it('does not throw when activeState is "false", regardless of mode', async () => {
			globalConfig.executions.mode = 'regular';

			const command = buildCommand();
			// @ts-expect-error Protected property
			command.flags = {
				separate: false,
				activeState: 'false',
			};

			await expect(command.run()).resolves.toBeUndefined();
		});
	});
});
