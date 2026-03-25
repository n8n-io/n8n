"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Auths = void 0;
const registry_matches_1 = require("./registry-matches");
class Auths {
    getName() {
        return "Auths";
    }
    async getAuthConfig(registry, dockerConfig) {
        const auth = this.findAuthEntry(registry, dockerConfig);
        if (!auth) {
            return undefined;
        }
        if (auth.identitytoken) {
            return {
                registryAddress: registry,
                identityToken: auth.identitytoken,
            };
        }
        const authConfig = { registryAddress: registry };
        if (auth.email) {
            authConfig.email = auth.email;
        }
        if (auth.auth) {
            const decodedAuth = Buffer.from(auth.auth, "base64").toString();
            const [username, ...passwordParts] = decodedAuth.split(":");
            const password = passwordParts.join(":");
            authConfig.username = username;
            authConfig.password = password;
        }
        else {
            if (auth.username) {
                authConfig.username = auth.username;
            }
            if (auth.password) {
                authConfig.password = auth.password;
            }
        }
        return authConfig;
    }
    findAuthEntry(registry, dockerConfig) {
        const authEntries = dockerConfig.auths ?? {};
        for (const key in authEntries) {
            if ((0, registry_matches_1.registryMatches)(key, registry)) {
                return authEntries[key];
            }
        }
        return undefined;
    }
}
exports.Auths = Auths;
//# sourceMappingURL=auths.js.map