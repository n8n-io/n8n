// warning: extremely hot code path.
// This has been meticulously optimized for use
// within npm install on large package trees.
// Do not edit without careful benchmarking.
const normalizeCache = Object.create(null);
// Limit the size of this. Very low-sophistication LRU cache
const MAX = 10000;
const cache = new Set();
export const normalizeUnicode = (s) => {
    if (!cache.has(s)) {
        // shake out identical accents and ligatures
        normalizeCache[s] = s
            .normalize('NFD')
            .toLocaleLowerCase('en')
            .toLocaleUpperCase('en');
    }
    else {
        cache.delete(s);
    }
    cache.add(s);
    const ret = normalizeCache[s];
    let i = cache.size - MAX;
    // only prune when we're 10% over the max
    if (i > MAX / 10) {
        for (const s of cache) {
            cache.delete(s);
            delete normalizeCache[s];
            if (--i <= 0)
                break;
        }
    }
    return ret;
};
//# sourceMappingURL=normalize-unicode.js.map