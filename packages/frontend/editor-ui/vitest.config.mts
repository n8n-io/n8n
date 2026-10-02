import { vitestConfig } from '@n8n/vitest-config/frontend';
import { mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.mjs';

// This file is separate from `vite.config.mts`, because `@n8n/vitest-config` resolves to its
// `dist`. Only `test` always has that `dist`, because turbo builds the dependencies before `test`.
export default mergeConfig(viteConfig, vitestConfig);
