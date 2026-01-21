import { createVitestDecoratorConfig } from '@n8n/vitest-config/node-decorators';

export default createVitestDecoratorConfig({
	include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
});
