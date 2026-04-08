import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';

export default createVitestConfigWithDecorators({
	coveragePathIgnorePatterns: ['index.ts'],
});
