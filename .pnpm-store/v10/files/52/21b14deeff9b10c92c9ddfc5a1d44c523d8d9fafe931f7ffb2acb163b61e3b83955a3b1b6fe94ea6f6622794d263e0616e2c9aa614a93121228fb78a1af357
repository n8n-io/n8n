export class DefaultIdentityProviderConfig {
    authSchemes = new Map();
    constructor(config) {
        for (const [key, value] of Object.entries(config)) {
            if (value !== undefined) {
                this.authSchemes.set(key, value);
            }
        }
    }
    getIdentityProvider(schemeId) {
        return this.authSchemes.get(schemeId);
    }
}
