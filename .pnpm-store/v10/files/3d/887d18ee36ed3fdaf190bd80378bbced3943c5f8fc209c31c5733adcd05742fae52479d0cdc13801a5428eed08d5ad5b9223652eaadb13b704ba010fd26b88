"use strict";
// tar -u
Object.defineProperty(exports, "__esModule", { value: true });
exports.update = void 0;
const make_command_js_1 = require("./make-command.js");
const replace_js_1 = require("./replace.js");
// just call tar.r with the filter and mtimeCache
exports.update = (0, make_command_js_1.makeCommand)(replace_js_1.replace.syncFile, replace_js_1.replace.asyncFile, replace_js_1.replace.syncNoFile, replace_js_1.replace.asyncNoFile, (opt, entries = []) => {
    replace_js_1.replace.validate?.(opt, entries);
    mtimeFilter(opt);
});
const mtimeFilter = (opt) => {
    const filter = opt.filter;
    if (!opt.mtimeCache) {
        opt.mtimeCache = new Map();
    }
    opt.filter =
        filter ?
            (path, stat) => filter(path, stat) &&
                !(
                /* c8 ignore start */
                ((opt.mtimeCache?.get(path) ?? stat.mtime ?? 0) >
                    (stat.mtime ?? 0))
                /* c8 ignore stop */
                )
            : (path, stat) => !(
            /* c8 ignore start */
            ((opt.mtimeCache?.get(path) ?? stat.mtime ?? 0) >
                (stat.mtime ?? 0))
            /* c8 ignore stop */
            );
};
//# sourceMappingURL=update.js.map