"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptClientToken = promptClientToken;
exports.handleLogin = handleLogin;
exports.handleLogout = handleLogout;
const colorette_1 = require("colorette");
const openapi_core_1 = require("@redocly/openapi-core");
const miscellaneous_1 = require("../utils/miscellaneous");
const oauth_client_1 = require("../auth/oauth-client");
const api_1 = require("../reunite/api");
function promptClientToken(domain) {
    return (0, miscellaneous_1.promptUser)((0, colorette_1.green)(`\n  🔑 Copy your API key from ${(0, colorette_1.blue)(`https://app.${domain}/profile`)} and paste it below`) + (0, colorette_1.yellow)(' (if you want to log in with Reunite, please run `redocly login --next` instead)'), true);
}
async function handleLogin({ argv, config, version }) {
    if (argv.next) {
        try {
            const reuniteUrl = (0, api_1.getReuniteUrl)(argv.residency);
            const oauthClient = new oauth_client_1.RedoclyOAuthClient('redocly-cli', version);
            await oauthClient.login(reuniteUrl);
        }
        catch {
            if (argv.residency) {
                const reuniteUrl = (0, api_1.getReuniteUrl)(argv.residency);
                (0, miscellaneous_1.exitWithError)(`❌ Connection to ${reuniteUrl} failed.`);
            }
            else {
                (0, miscellaneous_1.exitWithError)(`❌ Login failed. Please check your credentials and try again.`);
            }
        }
    }
    else {
        try {
            const region = argv.residency || config.region;
            const client = new openapi_core_1.RedoclyClient(region);
            const clientToken = await promptClientToken(client.domain);
            process.stdout.write((0, colorette_1.gray)('\n  Logging in...\n'));
            await client.login(clientToken, argv.verbose);
            process.stdout.write((0, colorette_1.green)('  Authorization confirmed. ✅\n\n'));
        }
        catch (err) {
            (0, miscellaneous_1.exitWithError)('  ' + err?.message);
        }
    }
}
async function handleLogout({ version }) {
    const client = new openapi_core_1.RedoclyClient();
    client.logout();
    const oauthClient = new oauth_client_1.RedoclyOAuthClient('redocly-cli', version);
    oauthClient.logout();
    process.stdout.write('Logged out from the Redocly account. ✋ \n');
}
