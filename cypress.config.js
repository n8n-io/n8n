const fetch = require('node-fetch');
const { defineConfig } = require('cypress');

const BASE_URL = 'http://localhost:5678';

module.exports = defineConfig({
	projectId: "5hbsdn",
	retries: {
		openMode: 0,
		runMode: 2,
	},
	defaultCommandTimeout: 10000,
	requestTimeout: 12000,
	numTestsKeptInMemory: 0,
	experimentalMemoryManagement: true,
	e2e: {
		baseUrl: BASE_URL,
		video: true,
		screenshotOnRunFailure: true,
		experimentalInteractiveRunEvents: true,
		experimentalSessionAndOrigin: true,

		setupNodeEvents(on, config) {
			on('task', {
				reset: () => fetch(BASE_URL + '/e2e/db/reset', { method: 'POST' }),
				'setup-owner': (payload) => {
					try {
						return fetch(BASE_URL + '/e2e/db/setup-owner', {
							method: 'POST',
							body: JSON.stringify(payload),
							headers: { 'Content-Type': 'application/json' },
						})
					} catch (error) {
						console.error("setup-owner failed with: ", error)
						return null
					}
				},
				'enable-feature': (feature) =>
					fetch(BASE_URL + `/e2e/enable-feature/${feature}`, { method: 'POST' }),
			});
		},
	},
});

