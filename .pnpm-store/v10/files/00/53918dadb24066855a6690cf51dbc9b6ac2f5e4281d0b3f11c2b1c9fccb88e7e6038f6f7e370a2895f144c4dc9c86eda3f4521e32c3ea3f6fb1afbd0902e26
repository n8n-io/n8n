"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pullImage = void 0;
const byline_1 = __importDefault(require("byline"));
const common_1 = require("../../common");
const get_auth_config_1 = require("../auth/get-auth-config");
const image_exists_1 = require("./image-exists");
const pullImage = async (dockerode, indexServerAddress, options) => {
    try {
        if (!options.force && (await (0, image_exists_1.imageExists)(dockerode, options.imageName))) {
            common_1.log.debug(`Not pulling image "${options.imageName.string}" as it already exists`);
            return;
        }
        common_1.log.info(`Pulling image "${options.imageName.string}"...`);
        const authconfig = await (0, get_auth_config_1.getAuthConfig)(options.imageName.registry ?? indexServerAddress);
        const stream = await dockerode.pull(options.imageName.string, { authconfig });
        return new Promise((resolve) => {
            (0, byline_1.default)(stream).on("data", (line) => {
                if (common_1.pullLog.enabled()) {
                    common_1.pullLog.trace(line, { imageName: options.imageName.string });
                }
            });
            stream.on("end", resolve);
        });
    }
    catch (err) {
        common_1.log.error(`Failed to pull image "${options.imageName.string}": ${err}`);
        throw err;
    }
};
exports.pullImage = pullImage;
//# sourceMappingURL=pull-image.js.map