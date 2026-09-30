import { Workspace, type WorkspaceFilesystem } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';

import type { Logger } from '../../logger';
import { createLazyRuntimeWorkspace } from '../lazy-runtime-workspace';
import { warmWorkspace } from '../warm-workspace';

function createLogger(): Logger {
	return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
}

function createLocalWorkspace() {
	const filesystem = {
		id: 'fs',
		name: 'Filesystem',
		provider: 'local',
		status: 'ready',
		basePath: '/tmp/warm-workspace-root',
	} as unknown as WorkspaceFilesystem;
	return new Workspace({ filesystem });
}

const flush = async () => await new Promise((resolve) => setImmediate(resolve));

describe('warmWorkspace', () => {
	it('provisions the lazy workspace once so the build reuses it', async () => {
		const ensureWorkspace = vi.fn(async () => await Promise.resolve(createLocalWorkspace()));
		const workspace = createLazyRuntimeWorkspace({ ensureWorkspace });
		const context = { workspace, logger: createLogger() };

		warmWorkspace(context);
		warmWorkspace(context);
		await flush();

		expect(ensureWorkspace).toHaveBeenCalledTimes(1);
		await expect(getWorkspaceRoot(workspace)).resolves.toBe('/tmp/warm-workspace-root');
		expect(ensureWorkspace).toHaveBeenCalledTimes(1);
	});

	it('logs a failed provisioning at debug level without throwing and does not retry', async () => {
		const ensureWorkspace = vi.fn(async () => await Promise.reject(new Error('no sandbox')));
		const context = {
			workspace: createLazyRuntimeWorkspace({ ensureWorkspace }),
			logger: createLogger(),
		};

		expect(() => warmWorkspace(context)).not.toThrow();
		await flush();
		warmWorkspace(context);
		await flush();

		expect(ensureWorkspace).toHaveBeenCalledTimes(1);
		expect(context.logger.debug).toHaveBeenCalledWith('Workspace warm-up failed', {
			error: 'no sandbox',
		});
	});

	it('does nothing without a workspace', () => {
		const logger = createLogger();

		expect(() => warmWorkspace({ workspace: undefined, logger })).not.toThrow();
		expect(logger.debug).not.toHaveBeenCalled();
	});
});
