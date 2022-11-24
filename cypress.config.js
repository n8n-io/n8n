const fetch = require('node-fetch');
const { defineConfig } = require('cypress');

const baseUrl = 'http://localhost:5678';

module.exports = defineConfig({
	e2e: {
		baseUrl,
		video: false,
		screenshotOnRunFailure: true,
		experimentalSessionAndOrigin: true,
		experimentalInteractiveRunEvents: true,

		setupNodeEvents(on) {
			on('task', {
				'db:reset': () => fetch(baseUrl + '/e2e/db/reset', { method: 'POST' }),
				'db:setup-owner': (payload) =>
					fetch(baseUrl + '/e2e/db/setup-owner', {
						method: 'POST',
						body: JSON.stringify(payload),
						headers: { 'Content-Type': 'application/json' },
					}),
			});
		},
	},
});
