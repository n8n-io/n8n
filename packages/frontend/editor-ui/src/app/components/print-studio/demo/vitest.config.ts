import { defineConfig } from 'vitest/config';
export default defineConfig({
	test: { environment: 'node', include: ['src/app/components/print-studio/*.test.ts'] },
});
