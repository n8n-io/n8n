"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServiceScript = getServiceScript;
function getServiceScript(language, fileName) {
    const sourceScript = language.scripts.get(fileName);
    if (sourceScript?.targetIds.size) {
        for (const targetId of sourceScript.targetIds) {
            const targetScript = language.scripts.get(targetId);
            if (targetScript?.generated) {
                const serviceScript = targetScript.generated.languagePlugin.typescript?.getServiceScript(targetScript.generated.root);
                if (serviceScript) {
                    return [serviceScript, targetScript, sourceScript];
                }
            }
        }
    }
    if (sourceScript?.associatedOnly) {
        return [undefined, sourceScript, sourceScript];
    }
    if (sourceScript?.generated) {
        const serviceScript = sourceScript.generated.languagePlugin.typescript?.getServiceScript(sourceScript.generated.root);
        if (serviceScript) {
            return [serviceScript, sourceScript, sourceScript];
        }
    }
    return [undefined, undefined, undefined];
}
//# sourceMappingURL=utils.js.map