import { mock } from 'vitest-mock-extended';

import { AppBuildReconciliationTask } from '../app-build-reconciliation.task';
import { AppVersionRepository } from '../../versions/app-version.repository';
import { AppsConfig } from '../../apps.config';

afterEach(() => vi.restoreAllMocks());

it('uses separate start and build timeouts from the app config', async () => {
	const now = 1_000_000;
	vi.spyOn(Date, 'now').mockReturnValue(now);
	const config = new AppsConfig();
	config.buildStartTimeoutMs = 900;
	config.buildTimeoutMs = 2000;
	const versions = mock<AppVersionRepository>();
	const task = new AppBuildReconciliationTask(versions, config);

	await task.run(new AbortController().signal);

	expect(versions.failInterruptedBuilds).toHaveBeenCalledWith(
		new Date(now - 900),
		new Date(now - 2000),
	);
});
