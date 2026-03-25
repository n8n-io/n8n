"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialProvider = void 0;
const child_process_1 = require("child_process");
const common_1 = require("../../common");
class CredentialProvider {
    async getAuthConfig(registry, dockerConfig) {
        const credentialProviderName = this.getCredentialProviderName(registry, dockerConfig);
        if (!credentialProviderName) {
            return undefined;
        }
        const programName = `docker-credential-${credentialProviderName}`;
        common_1.log.debug(`Executing Docker credential provider "${programName}"`);
        return await this.runCredentialProvider(registry, programName);
    }
    runCredentialProvider(registry, providerName) {
        return new Promise((resolve, reject) => {
            const sink = (0, child_process_1.spawn)(providerName, ["get"]);
            const chunks = [];
            sink.stdout.on("data", (chunk) => chunks.push(chunk));
            sink.on("error", (err) => {
                common_1.log.error(`Error from Docker credential provider: ${err}`);
                sink.kill("SIGKILL");
                reject(new Error(`Error from Docker credential provider: ${err}`));
            });
            sink.on("close", (code) => {
                if (code !== 0) {
                    return resolve(undefined);
                }
                const response = chunks.join("");
                try {
                    const credentialProviderResponse = JSON.parse(response);
                    const authConfig = credentialProviderResponse.Username === "<token>"
                        ? this.parseIdentityTokenConfig(registry, credentialProviderResponse)
                        : this.parseUsernamePasswordConfig(registry, credentialProviderResponse);
                    return resolve(authConfig);
                }
                catch (e) {
                    common_1.log.error(`Unexpected response from Docker credential provider GET command: "${response}"`);
                    return reject(new Error("Unexpected response from Docker credential provider GET command"));
                }
            });
            sink.stdin.write(`${registry}\n`);
            sink.stdin.end();
        });
    }
    parseUsernamePasswordConfig(registry, config) {
        return {
            username: config.Username,
            password: config.Secret,
            registryAddress: config.ServerURL ?? registry,
        };
    }
    parseIdentityTokenConfig(registry, config) {
        return {
            registryAddress: config.ServerURL ?? registry,
            identityToken: config.Secret,
        };
    }
}
exports.CredentialProvider = CredentialProvider;
//# sourceMappingURL=credential-provider.js.map