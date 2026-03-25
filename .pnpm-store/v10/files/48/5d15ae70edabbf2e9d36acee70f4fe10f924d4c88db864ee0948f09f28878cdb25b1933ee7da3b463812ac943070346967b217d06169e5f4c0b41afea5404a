"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInContainer = void 0;
const common_1 = require("../../common");
const image_name_1 = require("../image-name");
const attach_container_1 = require("./attach-container");
const pull_image_1 = require("./pull-image");
const start_container_1 = require("./start-container");
const runInContainer = async (dockerode, indexServerAddress, image, command) => {
    try {
        await (0, pull_image_1.pullImage)(dockerode, indexServerAddress, { imageName: image_name_1.ImageName.fromString(image), force: false });
        common_1.log.debug(`Creating container: ${image} with command "${command.join(" ")}"...`);
        const container = await dockerode.createContainer({ Image: image, Cmd: command });
        common_1.log.debug(`Attaching to container...`, { containerId: container.id });
        const stream = await (0, attach_container_1.attachContainer)(dockerode, container);
        common_1.log.debug(`Starting container...`, { containerId: container.id });
        await (0, start_container_1.startContainer)(container);
        common_1.log.debug(`Waiting for container output...`, { containerId: container.id });
        const output = await (0, common_1.streamToString)(stream, { trim: true });
        common_1.log.debug(`Removing container...`, { containerId: container.id });
        await container.remove({ force: true, v: true });
        return output.length === 0 ? undefined : output;
    }
    catch (err) {
        common_1.log.error(`Failed to run command "${command.join(" ")}" in container: "${err}"`);
        return undefined;
    }
};
exports.runInContainer = runInContainer;
//# sourceMappingURL=run-in-container.js.map