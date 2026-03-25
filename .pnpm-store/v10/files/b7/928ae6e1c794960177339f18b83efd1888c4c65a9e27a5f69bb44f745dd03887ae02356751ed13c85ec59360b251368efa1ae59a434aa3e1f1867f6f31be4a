import { mkdir, mkdirSync, stat, statSync, } from 'fs';
export const optsArg = (opts) => {
    if (!opts) {
        opts = { mode: 0o777 };
    }
    else if (typeof opts === 'object') {
        opts = { mode: 0o777, ...opts };
    }
    else if (typeof opts === 'number') {
        opts = { mode: opts };
    }
    else if (typeof opts === 'string') {
        opts = { mode: parseInt(opts, 8) };
    }
    else {
        throw new TypeError('invalid options argument');
    }
    const resolved = opts;
    const optsFs = opts.fs || {};
    opts.mkdir = opts.mkdir || optsFs.mkdir || mkdir;
    opts.mkdirAsync = opts.mkdirAsync
        ? opts.mkdirAsync
        : async (path, options) => {
            return new Promise((res, rej) => resolved.mkdir(path, options, (er, made) => er ? rej(er) : res(made)));
        };
    opts.stat = opts.stat || optsFs.stat || stat;
    opts.statAsync = opts.statAsync
        ? opts.statAsync
        : async (path) => new Promise((res, rej) => resolved.stat(path, (err, stats) => (err ? rej(err) : res(stats))));
    opts.statSync = opts.statSync || optsFs.statSync || statSync;
    opts.mkdirSync = opts.mkdirSync || optsFs.mkdirSync || mkdirSync;
    return resolved;
};
//# sourceMappingURL=opts-arg.js.map