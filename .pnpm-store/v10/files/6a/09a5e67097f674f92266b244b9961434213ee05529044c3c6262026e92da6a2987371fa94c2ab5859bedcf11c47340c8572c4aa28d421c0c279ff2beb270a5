"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.demuxStream = demuxStream;
const stream_1 = require("stream");
const common_1 = require("../../common");
async function demuxStream(dockerode, stream) {
    try {
        const demuxedStream = new stream_1.PassThrough({ autoDestroy: true, encoding: "utf-8" });
        dockerode.modem.demuxStream(stream, demuxedStream, demuxedStream);
        stream.on("end", () => demuxedStream.end());
        demuxedStream.on("close", () => {
            if (!stream.destroyed) {
                stream.destroy();
            }
        });
        return demuxedStream;
    }
    catch (err) {
        common_1.log.error(`Failed to demux stream: ${err}`);
        throw err;
    }
}
//# sourceMappingURL=demux-stream.js.map