"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
exports.IS_READ_ONLY = true;
function transformArguments() {
    return ['ROLE'];
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    switch (reply[0]) {
        case 'master':
            return {
                role: 'master',
                replicationOffest: reply[1],
                replicas: reply[2].map(([ip, port, replicationOffest]) => ({
                    ip,
                    port: Number(port),
                    replicationOffest: Number(replicationOffest)
                }))
            };
        case 'slave':
            return {
                role: 'slave',
                master: {
                    ip: reply[1],
                    port: reply[2]
                },
                state: reply[3],
                dataReceived: reply[4]
            };
        case 'sentinel':
            return {
                role: 'sentinel',
                masterNames: reply[1]
            };
    }
}
exports.transformReply = transformReply;
