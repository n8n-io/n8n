const { defineConfig } = require('cypress');

const BASE_URL = 'http://localhost:5678';

const timeOut = process.env.CI === 'true' ? 30_000 : 5_000;

module.exports = defineConfig({
	projectId: '5hbsdn',
	retries: {
		openMode: 0,
		runMode: 2,
	},
	defaultCommandTimeout: timeOut,
	requestTimeout: timeOut,
	numTestsKeptInMemory: 1,
	experimentalMemoryManagement: true,
	e2e: {
		baseUrl: BASE_URL,
		viewportWidth: 1536,
		viewportHeight: 960,
		video: true,
		screenshotOnRunFailure: true,
		experimentalInteractiveRunEvents: true,
		experimentalSessionAndOrigin: true,
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
});
