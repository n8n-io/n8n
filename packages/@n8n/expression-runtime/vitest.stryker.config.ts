// Vitest config used by Stryker only, not by `pnpm test` or CI unit runs.
// It is the normal config, thus every expression engine runs. The only change
// is the `forks` pool: the vm engine crashes Stryker's default `threads` pool.
import { forksPoolPlugin } from '@n8n/vitest-config/node';
import { mergeConfig } from 'vitest/config';

import vitestConfig from './vitest.config';

export default mergeConfig(vitestConfig, { plugins: [forksPoolPlugin()] });
