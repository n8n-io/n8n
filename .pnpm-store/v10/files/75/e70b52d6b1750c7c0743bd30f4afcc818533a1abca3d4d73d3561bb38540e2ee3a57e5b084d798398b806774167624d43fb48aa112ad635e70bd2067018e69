"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseComposeContainerName = parseComposeContainerName;
function parseComposeContainerName(projectName, containerName) {
    if (containerName.startsWith(`/${projectName}-`)) {
        return containerName.substring(`/${projectName}-`.length);
    }
    else if (containerName.startsWith("/")) {
        return containerName.substring(1);
    }
    else {
        throw new Error(`Unable to resolve container name for container name: "${containerName}", project name: "${projectName}"`);
    }
}
//# sourceMappingURL=parse-compose-container-name.js.map