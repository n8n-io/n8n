/// <reference types="node" />

import stream = require("stream");

declare function through(
    write?: (data: any) => void,
    end?: () => void,
    opts?: {
        autoDestroy: boolean;
    },
): through.ThroughStream;

declare namespace through {
    export interface ThroughStream extends stream.Transform {
        autoDestroy: boolean;
        queue: (chunk: any) => any;
    }
}

export = through;
