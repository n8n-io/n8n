"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = void 0;
exports.IS_READ_ONLY = true;
function transformArguments() {
    return ['CLIENT', 'INFO'];
}
exports.transformArguments = transformArguments;
const CLIENT_INFO_REGEX = /([^\s=]+)=([^\s]*)/g;
function transformReply(rawReply) {
    const map = {};
    for (const item of rawReply.matchAll(CLIENT_INFO_REGEX)) {
        map[item[1]] = item[2];
    }
    const reply = {
        id: Number(map.id),
        addr: map.addr,
        fd: Number(map.fd),
        name: map.name,
        age: Number(map.age),
        idle: Number(map.idle),
        flags: map.flags,
        db: Number(map.db),
        sub: Number(map.sub),
        psub: Number(map.psub),
        multi: Number(map.multi),
        qbuf: Number(map.qbuf),
        qbufFree: Number(map['qbuf-free']),
        argvMem: Number(map['argv-mem']),
        obl: Number(map.obl),
        oll: Number(map.oll),
        omem: Number(map.omem),
        totMem: Number(map['tot-mem']),
        events: map.events,
        cmd: map.cmd,
        user: map.user,
        libName: map['lib-name'],
        libVer: map['lib-ver'],
    };
    if (map.laddr !== undefined) {
        reply.laddr = map.laddr;
    }
    if (map.redir !== undefined) {
        reply.redir = Number(map.redir);
    }
    if (map.ssub !== undefined) {
        reply.ssub = Number(map.ssub);
    }
    if (map['multi-mem'] !== undefined) {
        reply.multiMem = Number(map['multi-mem']);
    }
    if (map.resp !== undefined) {
        reply.resp = Number(map.resp);
    }
    return reply;
}
exports.transformReply = transformReply;
