const { defineConfig } = require("cypress");


module.exports = defineConfig({
	e2e: {
		baseUrl: 'http://localhost:5678',
		video: false,
		screenshotOnRunFailure: false,
		experimentalSessionAndOrigin: true,
		experimentalInteractiveRunEvents: true,
	}
});
