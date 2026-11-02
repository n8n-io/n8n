// Vitest config used by Stryker only, not by `pnpm test` or CI unit runs.
// It is the normal config with two changes:
// - Only the default expression engine (vm) runs, next to the
//   engine-independent tests. The other engines would multiply the run time.
// - The `forks` pool: the vm engine crashes Stryker's default `threads` pool.
import { forksPoolPlugin } from '@n8n/vitest-config/node';
import { mergeConfig } from 'vitest/config';

import vitestConfig from './vitest.config';

const projects = vitestConfig.test?.projects?.filter(
	(project) =>
		typeof project !== 'object' ||
		!('test' in project) ||
		[undefined, '', 'vm'].includes(project.test?.env?.N8N_EXPRESSION_ENGINE),
);

export default mergeConfig(
	{ ...vitestConfig, test: { ...vitestConfig.test, projects } },
	{ plugins: [forksPoolPlugin()] },
);
