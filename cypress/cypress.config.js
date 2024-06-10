const { defineConfig } = require('cypress');

const BASE_URL = 'http://localhost:5678';

module.exports = defineConfig({
	projectId: '5hbsdn',
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
	},
	env: {
		MAX_PINNED_DATA_SIZE: process.env.VUE_APP_MAX_PINNED_DATA_SIZE
			? parseInt(process.env.VUE_APP_MAX_PINNED_DATA_SIZE, 10)
			: 16 * 1024,
	},
});
