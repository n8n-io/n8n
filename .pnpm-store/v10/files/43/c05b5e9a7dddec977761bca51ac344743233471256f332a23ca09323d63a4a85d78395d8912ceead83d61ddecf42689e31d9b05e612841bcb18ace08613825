"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.RedisClusterNodeLinkStates = exports.transformArguments = void 0;
function transformArguments() {
    return ['CLUSTER', 'NODES'];
}
exports.transformArguments = transformArguments;
var RedisClusterNodeLinkStates;
(function (RedisClusterNodeLinkStates) {
    RedisClusterNodeLinkStates["CONNECTED"] = "connected";
    RedisClusterNodeLinkStates["DISCONNECTED"] = "disconnected";
})(RedisClusterNodeLinkStates || (exports.RedisClusterNodeLinkStates = RedisClusterNodeLinkStates = {}));
function transformReply(reply) {
    const lines = reply.split('\n');
    lines.pop(); // last line is empty
    const mastersMap = new Map(), replicasMap = new Map();
    for (const line of lines) {
        const [id, address, flags, masterId, pingSent, pongRecv, configEpoch, linkState, ...slots] = line.split(' '), node = {
            id,
            address,
            ...transformNodeAddress(address),
            flags: flags.split(','),
            pingSent: Number(pingSent),
            pongRecv: Number(pongRecv),
            configEpoch: Number(configEpoch),
            linkState: linkState
        };
        if (masterId === '-') {
            let replicas = replicasMap.get(id);
            if (!replicas) {
                replicas = [];
                replicasMap.set(id, replicas);
            }
            mastersMap.set(id, {
                ...node,
                slots: slots.map(slot => {
                    // TODO: importing & exporting (https://redis.io/commands/cluster-nodes#special-slot-entries)
                    const [fromString, toString] = slot.split('-', 2), from = Number(fromString);
                    return {
                        from,
                        to: toString ? Number(toString) : from
                    };
                }),
                replicas
            });
        }
        else {
            const replicas = replicasMap.get(masterId);
            if (!replicas) {
                replicasMap.set(masterId, [node]);
            }
            else {
                replicas.push(node);
            }
        }
    }
    return [...mastersMap.values()];
}
exports.transformReply = transformReply;
function transformNodeAddress(address) {
    const indexOfColon = address.lastIndexOf(':'), indexOfAt = address.indexOf('@', indexOfColon), host = address.substring(0, indexOfColon);
    if (indexOfAt === -1) {
        return {
            host,
            port: Number(address.substring(indexOfColon + 1)),
            cport: null
        };
    }
    return {
        host: address.substring(0, indexOfColon),
        port: Number(address.substring(indexOfColon + 1, indexOfAt)),
        cport: Number(address.substring(indexOfAt + 1))
    };
}
