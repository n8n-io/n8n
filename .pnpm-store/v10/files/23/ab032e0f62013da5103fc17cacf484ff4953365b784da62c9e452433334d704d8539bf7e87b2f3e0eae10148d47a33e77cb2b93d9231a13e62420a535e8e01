"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultComposeOptions = defaultComposeOptions;
const os_1 = require("os");
const common_1 = require("../../../common");
function defaultComposeOptions(environment, options) {
    const log = options.logger ?? common_1.composeLog;
    return {
        log: false,
        callback: log.enabled()
            ? (chunk) => {
                chunk
                    .toString()
                    .split(os_1.EOL)
                    .filter(common_1.isNotEmptyString)
                    .forEach((line) => log.trace(line.trim()));
            }
            : undefined,
        cwd: options.filePath,
        config: options.files,
        composeOptions: options.composeOptions,
        commandOptions: options.commandOptions,
        env: {
            ...process.env,
            COMPOSE_PROJECT_NAME: options.projectName,
            ...{ ...environment, ...options.environment },
        },
        executable: options.executable,
    };
}
//# sourceMappingURL=default-compose-options.js.map