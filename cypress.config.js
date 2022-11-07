const os = require("os");
const { resolve } = require('path');
const { copyFile } = require('fs/promises');
const { defineConfig } = require("cypress");

const userHomeDir = os.homedir();
const n8nHomeFolder = resolve(userHomeDir, '.n8n');
const n8nCypressDb = resolve(n8nHomeFolder, 'cypress.sqlite');
const n8nCypressDbBackup = resolve(n8nHomeFolder, 'cypress.sqlite.bak');

module.exports = defineConfig({
	e2e: {
		baseUrl: 'http://localhost:5678',
		video: false,
		screenshotOnRunFailure: false,
		experimentalSessionAndOrigin: true,
		experimentalInteractiveRunEvents: true,
		setupNodeEvents(on, config) {},
	}
});
