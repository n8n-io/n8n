// tar -u
import { makeCommand } from './make-command.js';
import { replace as r } from './replace.js';
// just call tar.r with the filter and mtimeCache
export const update = makeCommand(r.syncFile, r.asyncFile, r.syncNoFile, r.asyncNoFile, (opt, entries = []) => {
    r.validate?.(opt, entries);
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