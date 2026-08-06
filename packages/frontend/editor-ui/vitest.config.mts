import { vitestConfig } from '@n8n/vitest-config/frontend';
import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.mjs';

// This file is separate from `vite.config.mts`, because `@n8n/vitest-config` resolves to its
// `dist`. Only `test` always has that `dist`, because turbo builds the dependencies before `test`.
// `vite.config.mts` exports a callback (it reads `command`/`mode`) and `mergeConfig` rejects
// callbacks, so resolve it against this run's env first.
export default defineConfig((env) => mergeConfig(viteConfig(env), vitestConfig));
