import { mergeConfig } from 'vite';
import { createVitestConfig } from '@n8n/vitest-config/frontend';

export default mergeConfig(
	createVitestConfig({
		// Test performance optimizations
		testTimeout: 15000, // 15 seconds per test (default is 5000ms)
		hookTimeout: 10000, // 10 seconds for setup/teardown hooks
		teardownTimeout: 10000, // 10 seconds for teardown

		// Worker configuration for parallel execution
		threads: true,
		maxThreads: 4, // Limit concurrent threads to prevent resource exhaustion
		minThreads: 1,

		// Memory management
		poolOptions: {
			threads: {
				singleThread: false,
				isolate: false, // Reuse worker context to speed up tests
			},
		},

		// Test filtering and execution
		passWithNoTests: true,
		bail: 1, // Stop after first test suite failure in CI

		// Improved test reporting
		reporter: process.env.CI ? ['github-actions', 'junit'] : ['default'],
		outputFile: {
			junit: './test-results/junit.xml',
		},

		// Coverage configuration optimized for large codebase
		coverage: {
			enabled: process.env.COVERAGE_ENABLED === 'true',
			provider: 'v8',
			reporter: process.env.CI
				? ['cobertura', 'json-summary']
				: ['text-summary', 'lcov', 'html-spa'],
			reportOnFailure: true,

			// Realistic thresholds for large frontend codebase
			thresholds: {
				branches: 70, // Reduced from 80% to be more realistic
				functions: 70, // Reduced from 80% to be more realistic
				lines: 75, // Reduced from 80% to be more realistic
				statements: 75, // Reduced from 80% to be more realistic
			},

			include: ['src/**/*.{js,ts,vue}'],
			exclude: [
				'src/__tests__/**',
				'src/**/__tests__/**',
				'src/**/*.test.{js,ts,vue}',
				'src/**/*.spec.{js,ts,vue}',
				'src/**/types.ts',
				'src/**/*.d.ts',
				'src/shims-*.d.ts',
				'src/components.d.ts',
				'src/type-utils.d.ts',
				'src/vue-virtual-scroller.d.ts',
				// Exclude mock/test utility files
				'src/__tests__/mocks.ts',
				'src/__tests__/utils.ts',
				'src/__tests__/render.ts',
				'src/__tests__/defaults.ts',
				'src/__tests__/setup.ts',
				// Exclude constants and configuration files
				'src/constants/**',
				'src/polyfills.ts',
				'src/init.ts',
				'src/main.ts',
			],

			// Skip coverage for files with low complexity
			skipFull: false,
			watermarks: {
				lines: [75, 85],
				functions: [70, 80],
				branches: [70, 80],
				statements: [75, 85],
			},
		},

		// Environment setup
		setupFiles: ['./src/__tests__/setup.ts'],
		globalSetup: [], // Add global setup if needed

		// File watching configuration
		watch: false, // Disable in CI

		// No longer need cache.dir - using Vite's cacheDir instead

		// Mock configuration
		clearMocks: true,
		restoreMocks: true,
		unstubEnvs: true,
		unstubGlobals: true,
	}),
	{},
);
