"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachContainer = void 0;
const common_1 = require("../../common");
const demux_stream_1 = require("./demux-stream");
const attachContainer = async (dockerode, container) => {
    try {
        const stream = (await container.attach({ stream: true, stdout: true, stderr: true }));
        return (0, demux_stream_1.demuxStream)(dockerode, stream);
    }
    catch (err) {
        common_1.log.error(`Failed to attach to container: ${err}`, { containerId: container.id });
        throw err;
    }
};
exports.attachContainer = attachContainer;
//# sourceMappingURL=attach-container.js.map