const fetch = require('node-fetch');
const { defineConfig } = require('cypress');

const BASE_URL = 'http://localhost:5678';

module.exports = defineConfig({
	e2e: {
		baseUrl: BASE_URL,
		video: false,
		screenshotOnRunFailure: true,
		experimentalSessionAndOrigin: true,
		experimentalInteractiveRunEvents: true,

		setupNodeEvents(on) {
			on('task', {
				'db:reset': () => fetch(BASE_URL + '/e2e/db/reset', { method: 'POST' }),
				'db:setup-owner': (payload) =>
					fetch(BASE_URL + '/e2e/db/setup-owner', {
						method: 'POST',
						body: JSON.stringify(payload),
						headers: { 'Content-Type': 'application/json' },
					}),
			});
		},
	},
});
