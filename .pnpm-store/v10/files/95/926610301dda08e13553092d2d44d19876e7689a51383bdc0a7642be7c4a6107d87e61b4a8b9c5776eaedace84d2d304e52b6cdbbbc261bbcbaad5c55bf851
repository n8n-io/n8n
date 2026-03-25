"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushInsertOptions = void 0;
const ADD = require("./ADD");
const ADDNX = require("./ADDNX");
const COUNT = require("./COUNT");
const DEL = require("./DEL");
const EXISTS = require("./EXISTS");
const INFO = require("./INFO");
const INSERT = require("./INSERT");
const INSERTNX = require("./INSERTNX");
const LOADCHUNK = require("./LOADCHUNK");
const RESERVE = require("./RESERVE");
const SCANDUMP = require("./SCANDUMP");
const generic_transformers_1 = require("@redis/client/dist/lib/commands/generic-transformers");
exports.default = {
    ADD,
    add: ADD,
    ADDNX,
    addNX: ADDNX,
    COUNT,
    count: COUNT,
    DEL,
    del: DEL,
    EXISTS,
    exists: EXISTS,
    INFO,
    info: INFO,
    INSERT,
    insert: INSERT,
    INSERTNX,
    insertNX: INSERTNX,
    LOADCHUNK,
    loadChunk: LOADCHUNK,
    RESERVE,
    reserve: RESERVE,
    SCANDUMP,
    scanDump: SCANDUMP
};
function pushInsertOptions(args, items, options) {
    if (options?.CAPACITY) {
        args.push('CAPACITY');
        args.push(options.CAPACITY.toString());
    }
    if (options?.NOCREATE) {
        args.push('NOCREATE');
    }
    args.push('ITEMS');
    return (0, generic_transformers_1.pushVerdictArguments)(args, items);
}
exports.pushInsertOptions = pushInsertOptions;
