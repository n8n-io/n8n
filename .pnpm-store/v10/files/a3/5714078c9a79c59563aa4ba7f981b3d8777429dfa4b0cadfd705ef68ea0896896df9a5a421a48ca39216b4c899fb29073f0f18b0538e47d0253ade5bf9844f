"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredsStore = void 0;
const credential_provider_1 = require("./credential-provider");
class CredsStore extends credential_provider_1.CredentialProvider {
    getName() {
        return "CredsStore";
    }
    getCredentialProviderName(registry, dockerConfig) {
        if (dockerConfig.credsStore !== undefined && dockerConfig.credsStore.length > 0) {
            return dockerConfig.credsStore;
        }
    }
}
exports.CredsStore = CredsStore;
//# sourceMappingURL=creds-store.js.map