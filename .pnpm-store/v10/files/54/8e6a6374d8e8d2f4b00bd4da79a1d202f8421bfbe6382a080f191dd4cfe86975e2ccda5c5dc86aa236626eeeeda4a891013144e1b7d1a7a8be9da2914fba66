"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskSecrets = maskSecrets;
exports.containsSecret = containsSecret;
function maskSecrets(target, secretValues) {
    const maskValue = () => '*'.repeat(8);
    if (typeof target === 'string') {
        let maskedString = target;
        secretValues.forEach((secret) => {
            maskedString = maskedString.split(secret).join('*'.repeat(secret.length));
        });
        return maskedString;
    }
    const masked = JSON.parse(JSON.stringify(target));
    const maskIfContainsSecret = (value) => {
        return containsSecret(value, secretValues) ? maskValue() : value;
    };
    const maskRecursive = (current) => {
        for (const key in current) {
            if (typeof current[key] === 'string') {
                current[key] = maskIfContainsSecret(current[key]);
            }
            else if (typeof current[key] === 'object' && current[key] !== null) {
                maskRecursive(current[key]);
            }
        }
    };
    maskRecursive(masked);
    return masked;
}
function containsSecret(value, secretValues) {
    return Array.from(secretValues).some((secret) => value.includes(secret));
}
//# sourceMappingURL=mask-secrets.js.map