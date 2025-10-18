import { createVitestConfigNodeWithDecorators } from '@n8n/vitest-config/node-decorators';

export default createVitestConfigNodeWithDecorators({
	include: ['src/**/*.test.ts'],
});
