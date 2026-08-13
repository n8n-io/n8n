import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '.env') });

export default defineConfig({
	test: {
		include: ['src/__tests__/integration/**/*.test.ts'],
		setupFiles: ['vitest.integration.setup.ts'],
		testTimeout: 120_000,
		hookTimeout: 30_000,
	},
});
