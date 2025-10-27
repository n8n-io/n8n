const { defineConfig } = require('cypress');

const BASE_URL = 'http://localhost:5678';

module.exports = defineConfig({
	retries: {
		openMode: 0,
		runMode: 2,
	},
	defaultCommandTimeout: 10000,
	requestTimeout: 12000,
	numTestsKeptInMemory: 2,
	experimentalMemoryManagement: true,
	e2e: {
		baseUrl: BASE_URL,
		viewportWidth: 1536,
		viewportHeight: 960,
		video: true,
		screenshotOnRunFailure: true,
		experimentalInteractiveRunEvents: true,
		specPattern: 'e2e/**/*.ts',
		supportFile: 'support/e2e.ts',
		fixturesFolder: 'fixtures',
		downloadsFolder: 'downloads',
		screenshotsFolder: 'screenshots',
		videosFolder: 'videos',
		setupNodeEvents(on, config) {
			require('@cypress/grep/src/plugin')(config);
			return config;
		},
	},
	reporter: 'mocha-junit-reporter',
	reporterOptions: {
		mochaFile: 'test-results-[hash].xml',
	},
});
