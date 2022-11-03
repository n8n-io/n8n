const { defineConfig } = require("cypress");

module.exports = defineConfig({
	e2e: {
		baseUrl: 'http://localhost:5678',
		experimentalSessionAndOrigin: true,
		setupNodeEvents(on, config) {
			on('task', {
				async 'db:reset'() {

				},
			})
		},
	}
});
