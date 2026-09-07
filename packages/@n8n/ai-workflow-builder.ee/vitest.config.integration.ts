import { mergeConfig } from 'vite';
import { baseConfig } from './vitest.config.base';

// Run only integration tests (`*.integration.test.ts`). These make real calls to
// external services and self-skip unless ENABLE_INTEGRATION_TESTS=true is set.
export default mergeConfig(baseConfig, {
	test: {
		include: ['**/*.integration.test.ts'],
	},
});
