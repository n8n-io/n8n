import { mergeConfig } from 'vitest/config';
import { createVitestConfig } from '@n8n/vitest-config/node';

export default mergeConfig(createVitestConfig(), {});
