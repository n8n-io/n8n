"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("../shared");
const ack_1 = require("./ack");
const handleAuth = (client, packet) => {
    const { options } = client;
    const version = options.protocolVersion;
    const rc = version === 5 ? packet.reasonCode : packet.returnCode;
    if (version !== 5) {
        const err = new shared_1.ErrorWithReasonCode(`Protocol error: Auth packets are only supported in MQTT 5. Your version:${version}`, rc);
        client.emit('error', err);
        return;
    }
    client.handleAuth(packet, (err, packet2) => {
        if (err) {
            client.emit('error', err);
            return;
        }
        if (rc === 24) {
            client.reconnecting = false;
            client['_sendPacket'](packet2);
        }
        else {
            const error = new shared_1.ErrorWithReasonCode(`Connection refused: ${ack_1.ReasonCodes[rc]}`, rc);
            client.emit('error', error);
        }
    });
};
exports.default = handleAuth;
//# sourceMappingURL=auth.js.map