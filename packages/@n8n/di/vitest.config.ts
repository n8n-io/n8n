import { mergeConfig } from 'vitest/config';
import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';

export default mergeConfig(createVitestConfigWithDecorators(), {});
