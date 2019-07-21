import Vorpal = require('vorpal');
import { Args } from 'vorpal';
import * as config from '../config';

const open = require('open');

import * as localtunnel from 'localtunnel';
import {
	ActiveWorkflowRunner,
	CredentialTypes,
	Db,
	GenericHelpers,
	LoadNodesAndCredentials,
	NodeTypes,
	TestWebhooks,
	Server,
} from "../src";
import {
	UserSettings,
} from "n8n-core";

import { promisify } from "util";
const tunnel = promisify(localtunnel);

let activeWorkflowRunner: ActiveWorkflowRunner.ActiveWorkflowRunner | undefined;


/**
 * Opens the UI in browser
 *
 */
function openBrowser() {
	const editorUrl = GenericHelpers.getBaseUrl();

	open(editorUrl, { wait: true })
		.catch((error: Error) => {
			console.log(`\nWas not able to open URL in browser. Please open manually by visiting:\n${editorUrl}\n`);
		});
}


module.exports = (vorpal: Vorpal) => {
	return vorpal
		.command('start')
		// @ts-ignore
		.description('Starts n8n. Makes Web-UI available and starts active workflows')
		.option('-o --open',
			'Opens the UI automatically in browser')
		.option('--tunnel',
			'Runs the webhooks via a hooks.n8n.cloud tunnel server')
		.option('\n')
		// 	TODO: Add validation
		// .validate((args: Args) => {
		// })
		.action((args: Args) => {

			if (process.pid === 1) {
				console.error(`The n8n node process should not run as process with ID 1 because that will cause
problems with shutting everything down correctly. If started with docker use the
flag "--init" to fix this problem!`);
				return;
			}

			// TODO: Start here the the script in a subprocess which can get restarted when new nodes get added and so new packages have to get installed

			// npm install / rm (in other process)
			// restart process depending on exit code (lets say 50 means restart)

			// Wrap that the process does not close but we can still use async
			(async () => {
				// Start directly with the init of the database to improve startup time
				const startDbInitPromise = Db.init();

				// Make sure the settings exist
				const userSettings = await UserSettings.prepareUserSettings();

				// Load all node and credential types
				const loadNodesAndCredentials = LoadNodesAndCredentials();
				await loadNodesAndCredentials.init();

				// Add the found types to an instance other parts of the application can use
				const nodeTypes = NodeTypes();
				await nodeTypes.init(loadNodesAndCredentials.nodeTypes);
				const credentialTypes = CredentialTypes();
				await credentialTypes.init(loadNodesAndCredentials.credentialTypes);

				// Wait till the database is ready
				await startDbInitPromise;

				if (args.options.tunnel !== undefined) {
					console.log('\nWaiting for tunnel ...');

					if (userSettings.tunnelSubdomain === undefined) {
						// When no tunnel subdomain did exist yet create a new random one
						const availableCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
						userSettings.tunnelSubdomain = Array.from({ length: 24 }).map(() => {
							return availableCharacters.charAt(Math.floor(Math.random() * availableCharacters.length));
						}).join('');

						await UserSettings.writeUserSettings(userSettings);
					}

					const tunnelSettings: localtunnel.TunnelConfig = {
						host: 'https://hooks.n8n.cloud',
						subdomain: userSettings.tunnelSubdomain,
					};

					const port = config.get('port') as number;

					// @ts-ignore
					const webhookTunnel = await tunnel(port, tunnelSettings);

					process.env.WEBHOOK_TUNNEL_URL = webhookTunnel.url + '/';
					console.log(`Tunnel URL: ${process.env.WEBHOOK_TUNNEL_URL}\n`);
				}

				Server.start();

				// Start to get active workflows and run their triggers
				activeWorkflowRunner = ActiveWorkflowRunner.getInstance();
				await activeWorkflowRunner.init();

				const editorUrl = GenericHelpers.getBaseUrl();
				console.log(`\nEditor is now accessible via:\n${editorUrl}`);

				// Allow to open n8n editor by pressing "o"
				if (Boolean(process.stdout.isTTY) && process.stdin.setRawMode) {
					process.stdin.setRawMode(true);
					process.stdin.resume();
					process.stdin.setEncoding('utf8');
					let inputText = '';

					if (args.options.browser !== undefined) {
						openBrowser();
					}
					console.log(`\nPress "o" to open in Browser.`);
					process.stdin.on("data", (key) => {
						if (key === 'o') {
							openBrowser();
							inputText = '';
						} else {
							// When anything else got pressed, record it and send it on enter into the child process
							if (key.charCodeAt(0) === 13) {
								// send to child process and print in terminal
								process.stdout.write('\n');
								inputText = '';
							} else {
								// record it and write into terminal
								inputText += key;
								process.stdout.write(key);
							}
						}
					});
				}
			})();


			vorpal.sigint(async () => {
				console.log(`\nStopping n8n...`);

				setTimeout(() => {
					// In case that something goes wrong with shutdown we
					// kill after max. 30 seconds no matter what
					process.exit();
				}, 30000);

				const removePromises = [];
				if (activeWorkflowRunner !== undefined) {
					removePromises.push(activeWorkflowRunner.removeAll());
				}

				// Remove all test webhooks
				const testWebhooks = TestWebhooks.getInstance();
				removePromises.push(testWebhooks.removeAll());

				await Promise.all(removePromises);

				process.exit();
			});
		});
};
