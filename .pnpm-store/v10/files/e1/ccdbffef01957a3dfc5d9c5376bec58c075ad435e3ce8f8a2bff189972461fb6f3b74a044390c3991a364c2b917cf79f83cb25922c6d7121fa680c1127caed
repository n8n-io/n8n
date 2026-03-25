"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validReasonCodes = [0, 16, 128, 131, 135, 144, 145, 151, 153];
const handlePublish = (client, packet, done) => {
    client.log('handlePublish: packet %o', packet);
    done = typeof done !== 'undefined' ? done : client.noop;
    let topic = packet.topic.toString();
    const message = packet.payload;
    const { qos } = packet;
    const { messageId } = packet;
    const { options } = client;
    if (client.options.protocolVersion === 5) {
        let alias;
        if (packet.properties) {
            alias = packet.properties.topicAlias;
        }
        if (typeof alias !== 'undefined') {
            if (topic.length === 0) {
                if (alias > 0 && alias <= 0xffff) {
                    const gotTopic = client['topicAliasRecv'].getTopicByAlias(alias);
                    if (gotTopic) {
                        topic = gotTopic;
                        client.log('handlePublish :: topic complemented by alias. topic: %s - alias: %d', topic, alias);
                    }
                    else {
                        client.log('handlePublish :: unregistered topic alias. alias: %d', alias);
                        client.emit('error', new Error('Received unregistered Topic Alias'));
                        return;
                    }
                }
                else {
                    client.log('handlePublish :: topic alias out of range. alias: %d', alias);
                    client.emit('error', new Error('Received Topic Alias is out of range'));
                    return;
                }
            }
            else if (client['topicAliasRecv'].put(topic, alias)) {
                client.log('handlePublish :: registered topic: %s - alias: %d', topic, alias);
            }
            else {
                client.log('handlePublish :: topic alias out of range. alias: %d', alias);
                client.emit('error', new Error('Received Topic Alias is out of range'));
                return;
            }
        }
    }
    client.log('handlePublish: qos %d', qos);
    switch (qos) {
        case 2: {
            options.customHandleAcks(topic, message, packet, (error, code) => {
                if (typeof error === 'number') {
                    code = error;
                    error = null;
                }
                if (error) {
                    return client.emit('error', error);
                }
                if (validReasonCodes.indexOf(code) === -1) {
                    return client.emit('error', new Error('Wrong reason code for pubrec'));
                }
                if (code) {
                    client['_sendPacket']({ cmd: 'pubrec', messageId, reasonCode: code }, done);
                }
                else {
                    client.incomingStore.put(packet, () => {
                        client['_sendPacket']({ cmd: 'pubrec', messageId }, done);
                    });
                }
            });
            break;
        }
        case 1: {
            options.customHandleAcks(topic, message, packet, (error, code) => {
                if (typeof error === 'number') {
                    code = error;
                    error = null;
                }
                if (error) {
                    return client.emit('error', error);
                }
                if (validReasonCodes.indexOf(code) === -1) {
                    return client.emit('error', new Error('Wrong reason code for puback'));
                }
                if (!code) {
                    client.emit('message', topic, message, packet);
                }
                client.handleMessage(packet, (err) => {
                    if (err) {
                        return done && done(err);
                    }
                    client['_sendPacket']({ cmd: 'puback', messageId, reasonCode: code }, done);
                });
            });
            break;
        }
        case 0:
            client.emit('message', topic, message, packet);
            client.handleMessage(packet, done);
            break;
        default:
            client.log('handlePublish: unknown QoS. Doing nothing.');
            break;
    }
};
exports.default = handlePublish;
//# sourceMappingURL=publish.js.map