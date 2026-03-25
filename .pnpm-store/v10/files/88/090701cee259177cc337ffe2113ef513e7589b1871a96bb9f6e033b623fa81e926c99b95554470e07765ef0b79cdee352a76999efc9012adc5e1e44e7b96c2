"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredHelpers = void 0;
const credential_provider_1 = require("./credential-provider");
class CredHelpers extends credential_provider_1.CredentialProvider {
    getName() {
        return "CredHelpers";
    }
    getCredentialProviderName(registry, dockerConfig) {
        if (dockerConfig.credHelpers?.[registry] !== undefined) {
            return dockerConfig.credHelpers[registry];
        }
    }
}
exports.CredHelpers = CredHelpers;
//# sourceMappingURL=cred-helpers.js.map