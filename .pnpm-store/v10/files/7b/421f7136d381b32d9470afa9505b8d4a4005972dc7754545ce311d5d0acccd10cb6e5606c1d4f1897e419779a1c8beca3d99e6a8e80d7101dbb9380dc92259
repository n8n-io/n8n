"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = void 0;
function transformArguments() {
    return ['MEMORY', 'STATS'];
}
exports.transformArguments = transformArguments;
const FIELDS_MAPPING = {
    'peak.allocated': 'peakAllocated',
    'total.allocated': 'totalAllocated',
    'startup.allocated': 'startupAllocated',
    'replication.backlog': 'replicationBacklog',
    'clients.slaves': 'clientsReplicas',
    'clients.normal': 'clientsNormal',
    'aof.buffer': 'aofBuffer',
    'lua.caches': 'luaCaches',
    'overhead.total': 'overheadTotal',
    'keys.count': 'keysCount',
    'keys.bytes-per-key': 'keysBytesPerKey',
    'dataset.bytes': 'datasetBytes',
    'dataset.percentage': 'datasetPercentage',
    'peak.percentage': 'peakPercentage',
    'allocator.allocated': 'allocatorAllocated',
    'allocator.active': 'allocatorActive',
    'allocator.resident': 'allocatorResident',
    'allocator-fragmentation.ratio': 'allocatorFragmentationRatio',
    'allocator-fragmentation.bytes': 'allocatorFragmentationBytes',
    'allocator-rss.ratio': 'allocatorRssRatio',
    'allocator-rss.bytes': 'allocatorRssBytes',
    'rss-overhead.ratio': 'rssOverheadRatio',
    'rss-overhead.bytes': 'rssOverheadBytes',
    'fragmentation': 'fragmentation',
    'fragmentation.bytes': 'fragmentationBytes'
}, DB_FIELDS_MAPPING = {
    'overhead.hashtable.main': 'overheadHashtableMain',
    'overhead.hashtable.expires': 'overheadHashtableExpires'
};
function transformReply(rawReply) {
    const reply = {
        db: {}
    };
    for (let i = 0; i < rawReply.length; i += 2) {
        const key = rawReply[i];
        if (key.startsWith('db.')) {
            const dbTuples = rawReply[i + 1], db = {};
            for (let j = 0; j < dbTuples.length; j += 2) {
                db[DB_FIELDS_MAPPING[dbTuples[j]]] = dbTuples[j + 1];
            }
            reply.db[key.substring(3)] = db;
            continue;
        }
        reply[FIELDS_MAPPING[key]] = Number(rawReply[i + 1]);
    }
    return reply;
}
exports.transformReply = transformReply;
