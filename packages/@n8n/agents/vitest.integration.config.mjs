import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'vitest/config';
import { profilingReporters } from '@n8n/vitest-config/node';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '.env'), quiet: true });

export default defineConfig({
	test: {
		include: ['src/__tests__/integration/**/*.test.ts'],
		setupFiles: ['vitest.integration.setup.ts'],
		reporters: profilingReporters(['default']),
		testTimeout: 120_000,
		hookTimeout: 30_000,
	},
});
