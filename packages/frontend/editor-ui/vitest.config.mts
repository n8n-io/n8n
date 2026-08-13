import { vitestConfig } from '@n8n/vitest-config/frontend';
import { mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.mjs';

// Kept out of `vite.config.mts` because `@n8n/vitest-config` resolves to its `dist`, which a
// clean checkout does not have: `dev` must start without a build step, while `test` runs under
// turbo, which builds dependencies first. Vitest picks this file over `vite.config.mts`.
export default mergeConfig(viteConfig, vitestConfig);
