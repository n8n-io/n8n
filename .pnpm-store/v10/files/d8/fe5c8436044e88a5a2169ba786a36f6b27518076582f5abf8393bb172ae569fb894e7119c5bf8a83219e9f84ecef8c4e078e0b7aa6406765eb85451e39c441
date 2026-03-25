"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptClientToken = promptClientToken;
exports.handleLogin = handleLogin;
const colorette_1 = require("colorette");
const openapi_core_1 = require("@redocly/openapi-core");
const miscellaneous_1 = require("../utils/miscellaneous");
function promptClientToken(domain) {
    return (0, miscellaneous_1.promptUser)((0, colorette_1.green)(`\n  🔑 Copy your API key from ${(0, colorette_1.blue)(`https://app.${domain}/profile`)} and paste it below`), true);
}
async function handleLogin({ argv, config }) {
    try {
        const region = argv.region || config.region;
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
