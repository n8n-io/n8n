"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ack_1 = require("./ack");
const topic_alias_send_1 = __importDefault(require("../topic-alias-send"));
const shared_1 = require("../shared");
const handleConnack = (client, packet) => {
    client.log('_handleConnack');
    const { options } = client;
    const version = options.protocolVersion;
    const rc = version === 5 ? packet.reasonCode : packet.returnCode;
    clearTimeout(client['connackTimer']);
    delete client['topicAliasSend'];
    if (packet.properties) {
        if (packet.properties.topicAliasMaximum) {
            if (packet.properties.topicAliasMaximum > 0xffff) {
                client.emit('error', new Error('topicAliasMaximum from broker is out of range'));
                return;
            }
            if (packet.properties.topicAliasMaximum > 0) {
                client['topicAliasSend'] = new topic_alias_send_1.default(packet.properties.topicAliasMaximum);
            }
        }
        if (packet.properties.serverKeepAlive && options.keepalive) {
            options.keepalive = packet.properties.serverKeepAlive;
        }
        if (packet.properties.maximumPacketSize) {
            if (!options.properties) {
                options.properties = {};
            }
            options.properties.maximumPacketSize =
                packet.properties.maximumPacketSize;
        }
    }
    if (rc === 0) {
        client.reconnecting = false;
        client['_onConnect'](packet);
    }
    else if (rc > 0) {
        const err = new shared_1.ErrorWithReasonCode(`Connection refused: ${ack_1.ReasonCodes[rc]}`, rc);
        client.emit('error', err);
    }
};
exports.default = handleConnack;
//# sourceMappingURL=connack.js.map