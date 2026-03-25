"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commands_1 = require("../cluster/commands");
const ACL_CAT = require("../commands/ACL_CAT");
const ACL_DELUSER = require("../commands/ACL_DELUSER");
const ACL_DRYRUN = require("../commands/ACL_DRYRUN");
const ACL_GENPASS = require("../commands/ACL_GENPASS");
const ACL_GETUSER = require("../commands/ACL_GETUSER");
const ACL_LIST = require("../commands/ACL_LIST");
const ACL_LOAD = require("../commands/ACL_LOAD");
const ACL_LOG_RESET = require("../commands/ACL_LOG_RESET");
const ACL_LOG = require("../commands/ACL_LOG");
const ACL_SAVE = require("../commands/ACL_SAVE");
const ACL_SETUSER = require("../commands/ACL_SETUSER");
const ACL_USERS = require("../commands/ACL_USERS");
const ACL_WHOAMI = require("../commands/ACL_WHOAMI");
const ASKING = require("../commands/ASKING");
const AUTH = require("../commands/AUTH");
const BGREWRITEAOF = require("../commands/BGREWRITEAOF");
const BGSAVE = require("../commands/BGSAVE");
const CLIENT_CACHING = require("../commands/CLIENT_CACHING");
const CLIENT_GETNAME = require("../commands/CLIENT_GETNAME");
const CLIENT_GETREDIR = require("../commands/CLIENT_GETREDIR");
const CLIENT_ID = require("../commands/CLIENT_ID");
const CLIENT_KILL = require("../commands/CLIENT_KILL");
const CLIENT_LIST = require("../commands/CLIENT_LIST");
const CLIENT_NO_EVICT = require("../commands/CLIENT_NO-EVICT");
const CLIENT_NO_TOUCH = require("../commands/CLIENT_NO-TOUCH");
const CLIENT_PAUSE = require("../commands/CLIENT_PAUSE");
const CLIENT_SETNAME = require("../commands/CLIENT_SETNAME");
const CLIENT_TRACKING = require("../commands/CLIENT_TRACKING");
const CLIENT_TRACKINGINFO = require("../commands/CLIENT_TRACKINGINFO");
const CLIENT_UNPAUSE = require("../commands/CLIENT_UNPAUSE");
const CLIENT_INFO = require("../commands/CLIENT_INFO");
const CLUSTER_ADDSLOTS = require("../commands/CLUSTER_ADDSLOTS");
const CLUSTER_ADDSLOTSRANGE = require("../commands/CLUSTER_ADDSLOTSRANGE");
const CLUSTER_BUMPEPOCH = require("../commands/CLUSTER_BUMPEPOCH");
const CLUSTER_COUNT_FAILURE_REPORTS = require("../commands/CLUSTER_COUNT-FAILURE-REPORTS");
const CLUSTER_COUNTKEYSINSLOT = require("../commands/CLUSTER_COUNTKEYSINSLOT");
const CLUSTER_DELSLOTS = require("../commands/CLUSTER_DELSLOTS");
const CLUSTER_DELSLOTSRANGE = require("../commands/CLUSTER_DELSLOTSRANGE");
const CLUSTER_FAILOVER = require("../commands/CLUSTER_FAILOVER");
const CLUSTER_FLUSHSLOTS = require("../commands/CLUSTER_FLUSHSLOTS");
const CLUSTER_FORGET = require("../commands/CLUSTER_FORGET");
const CLUSTER_GETKEYSINSLOT = require("../commands/CLUSTER_GETKEYSINSLOT");
const CLUSTER_INFO = require("../commands/CLUSTER_INFO");
const CLUSTER_KEYSLOT = require("../commands/CLUSTER_KEYSLOT");
const CLUSTER_LINKS = require("../commands/CLUSTER_LINKS");
const CLUSTER_MEET = require("../commands/CLUSTER_MEET");
const CLUSTER_MYID = require("../commands/CLUSTER_MYID");
const CLUSTER_MYSHARDID = require("../commands/CLUSTER_MYSHARDID");
const CLUSTER_NODES = require("../commands/CLUSTER_NODES");
const CLUSTER_REPLICAS = require("../commands/CLUSTER_REPLICAS");
const CLUSTER_REPLICATE = require("../commands/CLUSTER_REPLICATE");
const CLUSTER_RESET = require("../commands/CLUSTER_RESET");
const CLUSTER_SAVECONFIG = require("../commands/CLUSTER_SAVECONFIG");
const CLUSTER_SET_CONFIG_EPOCH = require("../commands/CLUSTER_SET-CONFIG-EPOCH");
const CLUSTER_SETSLOT = require("../commands/CLUSTER_SETSLOT");
const CLUSTER_SLOTS = require("../commands/CLUSTER_SLOTS");
const COMMAND_COUNT = require("../commands/COMMAND_COUNT");
const COMMAND_GETKEYS = require("../commands/COMMAND_GETKEYS");
const COMMAND_GETKEYSANDFLAGS = require("../commands/COMMAND_GETKEYSANDFLAGS");
const COMMAND_INFO = require("../commands/COMMAND_INFO");
const COMMAND_LIST = require("../commands/COMMAND_LIST");
const COMMAND = require("../commands/COMMAND");
const CONFIG_GET = require("../commands/CONFIG_GET");
const CONFIG_RESETASTAT = require("../commands/CONFIG_RESETSTAT");
const CONFIG_REWRITE = require("../commands/CONFIG_REWRITE");
const CONFIG_SET = require("../commands/CONFIG_SET");
const DBSIZE = require("../commands/DBSIZE");
const DISCARD = require("../commands/DISCARD");
const ECHO = require("../commands/ECHO");
const FAILOVER = require("../commands/FAILOVER");
const FLUSHALL = require("../commands/FLUSHALL");
const FLUSHDB = require("../commands/FLUSHDB");
const FUNCTION_DELETE = require("../commands/FUNCTION_DELETE");
const FUNCTION_DUMP = require("../commands/FUNCTION_DUMP");
const FUNCTION_FLUSH = require("../commands/FUNCTION_FLUSH");
const FUNCTION_KILL = require("../commands/FUNCTION_KILL");
const FUNCTION_LIST_WITHCODE = require("../commands/FUNCTION_LIST_WITHCODE");
const FUNCTION_LIST = require("../commands/FUNCTION_LIST");
const FUNCTION_LOAD = require("../commands/FUNCTION_LOAD");
const FUNCTION_RESTORE = require("../commands/FUNCTION_RESTORE");
const FUNCTION_STATS = require("../commands/FUNCTION_STATS");
const HELLO = require("../commands/HELLO");
const INFO = require("../commands/INFO");
const KEYS = require("../commands/KEYS");
const LASTSAVE = require("../commands/LASTSAVE");
const LATENCY_DOCTOR = require("../commands/LATENCY_DOCTOR");
const LATENCY_GRAPH = require("../commands/LATENCY_GRAPH");
const LATENCY_HISTORY = require("../commands/LATENCY_HISTORY");
const LATENCY_LATEST = require("../commands/LATENCY_LATEST");
const LOLWUT = require("../commands/LOLWUT");
const MEMORY_DOCTOR = require("../commands/MEMORY_DOCTOR");
const MEMORY_MALLOC_STATS = require("../commands/MEMORY_MALLOC-STATS");
const MEMORY_PURGE = require("../commands/MEMORY_PURGE");
const MEMORY_STATS = require("../commands/MEMORY_STATS");
const MEMORY_USAGE = require("../commands/MEMORY_USAGE");
const MODULE_LIST = require("../commands/MODULE_LIST");
const MODULE_LOAD = require("../commands/MODULE_LOAD");
const MODULE_UNLOAD = require("../commands/MODULE_UNLOAD");
const MOVE = require("../commands/MOVE");
const PING = require("../commands/PING");
const PUBSUB_CHANNELS = require("../commands/PUBSUB_CHANNELS");
const PUBSUB_NUMPAT = require("../commands/PUBSUB_NUMPAT");
const PUBSUB_NUMSUB = require("../commands/PUBSUB_NUMSUB");
const PUBSUB_SHARDCHANNELS = require("../commands/PUBSUB_SHARDCHANNELS");
const PUBSUB_SHARDNUMSUB = require("../commands/PUBSUB_SHARDNUMSUB");
const RANDOMKEY = require("../commands/RANDOMKEY");
const READONLY = require("../commands/READONLY");
const READWRITE = require("../commands/READWRITE");
const REPLICAOF = require("../commands/REPLICAOF");
const RESTORE_ASKING = require("../commands/RESTORE-ASKING");
const ROLE = require("../commands/ROLE");
const SAVE = require("../commands/SAVE");
const SCAN = require("../commands/SCAN");
const SCRIPT_DEBUG = require("../commands/SCRIPT_DEBUG");
const SCRIPT_EXISTS = require("../commands/SCRIPT_EXISTS");
const SCRIPT_FLUSH = require("../commands/SCRIPT_FLUSH");
const SCRIPT_KILL = require("../commands/SCRIPT_KILL");
const SCRIPT_LOAD = require("../commands/SCRIPT_LOAD");
const SHUTDOWN = require("../commands/SHUTDOWN");
const SWAPDB = require("../commands/SWAPDB");
const TIME = require("../commands/TIME");
const UNWATCH = require("../commands/UNWATCH");
const WAIT = require("../commands/WAIT");
exports.default = {
    ...commands_1.default,
    ACL_CAT,
    aclCat: ACL_CAT,
    ACL_DELUSER,
    aclDelUser: ACL_DELUSER,
    ACL_DRYRUN,
    aclDryRun: ACL_DRYRUN,
    ACL_GENPASS,
    aclGenPass: ACL_GENPASS,
    ACL_GETUSER,
    aclGetUser: ACL_GETUSER,
    ACL_LIST,
    aclList: ACL_LIST,
    ACL_LOAD,
    aclLoad: ACL_LOAD,
    ACL_LOG_RESET,
    aclLogReset: ACL_LOG_RESET,
    ACL_LOG,
    aclLog: ACL_LOG,
    ACL_SAVE,
    aclSave: ACL_SAVE,
    ACL_SETUSER,
    aclSetUser: ACL_SETUSER,
    ACL_USERS,
    aclUsers: ACL_USERS,
    ACL_WHOAMI,
    aclWhoAmI: ACL_WHOAMI,
    ASKING,
    asking: ASKING,
    AUTH,
    auth: AUTH,
    BGREWRITEAOF,
    bgRewriteAof: BGREWRITEAOF,
    BGSAVE,
    bgSave: BGSAVE,
    CLIENT_CACHING,
    clientCaching: CLIENT_CACHING,
    CLIENT_GETNAME,
    clientGetName: CLIENT_GETNAME,
    CLIENT_GETREDIR,
    clientGetRedir: CLIENT_GETREDIR,
    CLIENT_ID,
    clientId: CLIENT_ID,
    CLIENT_KILL,
    clientKill: CLIENT_KILL,
    'CLIENT_NO-EVICT': CLIENT_NO_EVICT,
    clientNoEvict: CLIENT_NO_EVICT,
    'CLIENT_NO-TOUCH': CLIENT_NO_TOUCH,
    clientNoTouch: CLIENT_NO_TOUCH,
    CLIENT_LIST,
    clientList: CLIENT_LIST,
    CLIENT_PAUSE,
    clientPause: CLIENT_PAUSE,
    CLIENT_SETNAME,
    clientSetName: CLIENT_SETNAME,
    CLIENT_TRACKING,
    clientTracking: CLIENT_TRACKING,
    CLIENT_TRACKINGINFO,
    clientTrackingInfo: CLIENT_TRACKINGINFO,
    CLIENT_UNPAUSE,
    clientUnpause: CLIENT_UNPAUSE,
    CLIENT_INFO,
    clientInfo: CLIENT_INFO,
    CLUSTER_ADDSLOTS,
    clusterAddSlots: CLUSTER_ADDSLOTS,
    CLUSTER_ADDSLOTSRANGE,
    clusterAddSlotsRange: CLUSTER_ADDSLOTSRANGE,
    CLUSTER_BUMPEPOCH,
    clusterBumpEpoch: CLUSTER_BUMPEPOCH,
    CLUSTER_COUNT_FAILURE_REPORTS,
    clusterCountFailureReports: CLUSTER_COUNT_FAILURE_REPORTS,
    CLUSTER_COUNTKEYSINSLOT,
    clusterCountKeysInSlot: CLUSTER_COUNTKEYSINSLOT,
    CLUSTER_DELSLOTS,
    clusterDelSlots: CLUSTER_DELSLOTS,
    CLUSTER_DELSLOTSRANGE,
    clusterDelSlotsRange: CLUSTER_DELSLOTSRANGE,
    CLUSTER_FAILOVER,
    clusterFailover: CLUSTER_FAILOVER,
    CLUSTER_FLUSHSLOTS,
    clusterFlushSlots: CLUSTER_FLUSHSLOTS,
    CLUSTER_FORGET,
    clusterForget: CLUSTER_FORGET,
    CLUSTER_GETKEYSINSLOT,
    clusterGetKeysInSlot: CLUSTER_GETKEYSINSLOT,
    CLUSTER_INFO,
    clusterInfo: CLUSTER_INFO,
    CLUSTER_KEYSLOT,
    clusterKeySlot: CLUSTER_KEYSLOT,
    CLUSTER_LINKS,
    clusterLinks: CLUSTER_LINKS,
    CLUSTER_MEET,
    clusterMeet: CLUSTER_MEET,
    CLUSTER_MYID,
    clusterMyId: CLUSTER_MYID,
    CLUSTER_MYSHARDID,
    clusterMyShardId: CLUSTER_MYSHARDID,
    CLUSTER_NODES,
    clusterNodes: CLUSTER_NODES,
    CLUSTER_REPLICAS,
    clusterReplicas: CLUSTER_REPLICAS,
    CLUSTER_REPLICATE,
    clusterReplicate: CLUSTER_REPLICATE,
    CLUSTER_RESET,
    clusterReset: CLUSTER_RESET,
    CLUSTER_SAVECONFIG,
    clusterSaveConfig: CLUSTER_SAVECONFIG,
    CLUSTER_SET_CONFIG_EPOCH,
    clusterSetConfigEpoch: CLUSTER_SET_CONFIG_EPOCH,
    CLUSTER_SETSLOT,
    clusterSetSlot: CLUSTER_SETSLOT,
    CLUSTER_SLOTS,
    clusterSlots: CLUSTER_SLOTS,
    COMMAND_COUNT,
    commandCount: COMMAND_COUNT,
    COMMAND_GETKEYS,
    commandGetKeys: COMMAND_GETKEYS,
    COMMAND_GETKEYSANDFLAGS,
    commandGetKeysAndFlags: COMMAND_GETKEYSANDFLAGS,
    COMMAND_INFO,
    commandInfo: COMMAND_INFO,
    COMMAND_LIST,
    commandList: COMMAND_LIST,
    COMMAND,
    command: COMMAND,
    CONFIG_GET,
    configGet: CONFIG_GET,
    CONFIG_RESETASTAT,
    configResetStat: CONFIG_RESETASTAT,
    CONFIG_REWRITE,
    configRewrite: CONFIG_REWRITE,
    CONFIG_SET,
    configSet: CONFIG_SET,
    DBSIZE,
    dbSize: DBSIZE,
    DISCARD,
    discard: DISCARD,
    ECHO,
    echo: ECHO,
    FAILOVER,
    failover: FAILOVER,
    FLUSHALL,
    flushAll: FLUSHALL,
    FLUSHDB,
    flushDb: FLUSHDB,
    FUNCTION_DELETE,
    functionDelete: FUNCTION_DELETE,
    FUNCTION_DUMP,
    functionDump: FUNCTION_DUMP,
    FUNCTION_FLUSH,
    functionFlush: FUNCTION_FLUSH,
    FUNCTION_KILL,
    functionKill: FUNCTION_KILL,
    FUNCTION_LIST_WITHCODE,
    functionListWithCode: FUNCTION_LIST_WITHCODE,
    FUNCTION_LIST,
    functionList: FUNCTION_LIST,
    FUNCTION_LOAD,
    functionLoad: FUNCTION_LOAD,
    FUNCTION_RESTORE,
    functionRestore: FUNCTION_RESTORE,
    FUNCTION_STATS,
    functionStats: FUNCTION_STATS,
    HELLO,
    hello: HELLO,
    INFO,
    info: INFO,
    KEYS,
    keys: KEYS,
    LASTSAVE,
    lastSave: LASTSAVE,
    LATENCY_DOCTOR,
    latencyDoctor: LATENCY_DOCTOR,
    LATENCY_GRAPH,
    latencyGraph: LATENCY_GRAPH,
    LATENCY_HISTORY,
    latencyHistory: LATENCY_HISTORY,
    LATENCY_LATEST,
    latencyLatest: LATENCY_LATEST,
    LOLWUT,
    lolwut: LOLWUT,
    MEMORY_DOCTOR,
    memoryDoctor: MEMORY_DOCTOR,
    'MEMORY_MALLOC-STATS': MEMORY_MALLOC_STATS,
    memoryMallocStats: MEMORY_MALLOC_STATS,
    MEMORY_PURGE,
    memoryPurge: MEMORY_PURGE,
    MEMORY_STATS,
    memoryStats: MEMORY_STATS,
    MEMORY_USAGE,
    memoryUsage: MEMORY_USAGE,
    MODULE_LIST,
    moduleList: MODULE_LIST,
    MODULE_LOAD,
    moduleLoad: MODULE_LOAD,
    MODULE_UNLOAD,
    moduleUnload: MODULE_UNLOAD,
    MOVE,
    move: MOVE,
    PING,
    ping: PING,
    PUBSUB_CHANNELS,
    pubSubChannels: PUBSUB_CHANNELS,
    PUBSUB_NUMPAT,
    pubSubNumPat: PUBSUB_NUMPAT,
    PUBSUB_NUMSUB,
    pubSubNumSub: PUBSUB_NUMSUB,
    PUBSUB_SHARDCHANNELS,
    pubSubShardChannels: PUBSUB_SHARDCHANNELS,
    PUBSUB_SHARDNUMSUB,
    pubSubShardNumSub: PUBSUB_SHARDNUMSUB,
    RANDOMKEY,
    randomKey: RANDOMKEY,
    READONLY,
    readonly: READONLY,
    READWRITE,
    readwrite: READWRITE,
    REPLICAOF,
    replicaOf: REPLICAOF,
    'RESTORE-ASKING': RESTORE_ASKING,
    restoreAsking: RESTORE_ASKING,
    ROLE,
    role: ROLE,
    SAVE,
    save: SAVE,
    SCAN,
    scan: SCAN,
    SCRIPT_DEBUG,
    scriptDebug: SCRIPT_DEBUG,
    SCRIPT_EXISTS,
    scriptExists: SCRIPT_EXISTS,
    SCRIPT_FLUSH,
    scriptFlush: SCRIPT_FLUSH,
    SCRIPT_KILL,
    scriptKill: SCRIPT_KILL,
    SCRIPT_LOAD,
    scriptLoad: SCRIPT_LOAD,
    SHUTDOWN,
    shutdown: SHUTDOWN,
    SWAPDB,
    swapDb: SWAPDB,
    TIME,
    time: TIME,
    UNWATCH,
    unwatch: UNWATCH,
    WAIT,
    wait: WAIT
};
