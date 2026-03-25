"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const publish_1 = __importDefault(require("./publish"));
const auth_1 = __importDefault(require("./auth"));
const connack_1 = __importDefault(require("./connack"));
const ack_1 = __importDefault(require("./ack"));
const pubrel_1 = __importDefault(require("./pubrel"));
const handle = (client, packet, done) => {
    const { options } = client;
    if (options.protocolVersion === 5 &&
        options.properties &&
        options.properties.maximumPacketSize &&
        options.properties.maximumPacketSize < packet.length) {
        client.emit('error', new Error(`exceeding packets size ${packet.cmd}`));
        client.end({
            reasonCode: 149,
            properties: { reasonString: 'Maximum packet size was exceeded' },
        });
        return client;
    }
    client.log('_handlePacket :: emitting packetreceive');
    client.emit('packetreceive', packet);
    switch (packet.cmd) {
        case 'publish':
            (0, publish_1.default)(client, packet, done);
            break;
        case 'puback':
        case 'pubrec':
        case 'pubcomp':
        case 'suback':
        case 'unsuback':
            client.reschedulePing();
            (0, ack_1.default)(client, packet);
            done();
            break;
        case 'pubrel':
            client.reschedulePing();
            (0, pubrel_1.default)(client, packet, done);
            break;
        case 'connack':
            (0, connack_1.default)(client, packet);
            done();
            break;
        case 'auth':
            client.reschedulePing();
            (0, auth_1.default)(client, packet);
            done();
            break;
        case 'pingresp':
            client.log('_handlePacket :: received pingresp');
            client.reschedulePing();
            done();
            break;
        case 'disconnect':
            client.emit('disconnect', packet);
            done();
            break;
        default:
            client.log('_handlePacket :: unknown command');
            done();
            break;
    }
};
exports.default = handle;
//# sourceMappingURL=index.js.map