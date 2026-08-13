import { vitestConfig } from '@n8n/vitest-config/frontend';
import { mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.mjs';

// Separate from `vite.config.mts` because `@n8n/vitest-config` resolves to its `dist`, which only
// `test` is guaranteed to have — it runs under turbo, which builds dependencies first.
export default mergeConfig(viteConfig, vitestConfig);
