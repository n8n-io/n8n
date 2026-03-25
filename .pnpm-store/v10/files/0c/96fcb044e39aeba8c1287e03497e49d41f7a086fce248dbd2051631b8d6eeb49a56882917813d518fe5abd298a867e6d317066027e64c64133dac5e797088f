"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handlePubrel = (client, packet, done) => {
    client.log('handling pubrel packet');
    const callback = typeof done !== 'undefined' ? done : client.noop;
    const { messageId } = packet;
    const comp = { cmd: 'pubcomp', messageId };
    client.incomingStore.get(packet, (err, pub) => {
        if (!err) {
            client.emit('message', pub.topic, pub.payload, pub);
            client.handleMessage(pub, (err2) => {
                if (err2) {
                    return callback(err2);
                }
                client.incomingStore.del(pub, client.noop);
                client['_sendPacket'](comp, callback);
            });
        }
        else {
            client['_sendPacket'](comp, callback);
        }
    });
};
exports.default = handlePubrel;
//# sourceMappingURL=pubrel.js.map