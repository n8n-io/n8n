const fetch = require('node-fetch');
const { defineConfig } = require('cypress');

const BASE_URL = 'http://localhost:5678';

module.exports = defineConfig({
	retries: {
		openMode: 1,
		runMode: 3
	},
	e2e: {
		baseUrl: BASE_URL,
		video: false,
		screenshotOnRunFailure: true,
		experimentalSessionAndOrigin: true,
		experimentalInteractiveRunEvents: true,

		setupNodeEvents(on, config) {
			on('task', {
				'reset': () => fetch(BASE_URL + '/e2e/db/reset', { method: 'POST' }),
				'setup-owner': (payload) =>
					fetch(BASE_URL + '/e2e/db/setup-owner', {
						method: 'POST',
						body: JSON.stringify(payload),
						headers: { 'Content-Type': 'application/json' },
					}),
			});
		},
	},
});
