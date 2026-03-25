"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bin_1 = require("../bin");
const argv_payload_1 = require("./argv-payload");
const base64ConfigArg = process.argv[2];
if (!base64ConfigArg.startsWith(argv_payload_1.argPrefix))
    throw new Error('unexpected argv');
const base64Payload = base64ConfigArg.slice(argv_payload_1.argPrefix.length);
const state = (0, argv_payload_1.decompress)(base64Payload);
state.isInChildProcess = true;
state.tsNodeScript = __filename;
state.parseArgvResult.argv = process.argv;
state.parseArgvResult.restArgs = process.argv.slice(3);
// Modify and re-compress the payload delivered to subsequent child processes.
// This logic may be refactored into bin.ts by https://github.com/TypeStrong/ts-node/issues/1831
if (state.isCli) {
    const stateForChildren = {
        ...state,
        isCli: false,
    };
    state.parseArgvResult.argv[2] = `${argv_payload_1.argPrefix}${(0, argv_payload_1.compress)(stateForChildren)}`;
}
(0, bin_1.bootstrap)(state);
//# sourceMappingURL=child-entrypoint.js.map