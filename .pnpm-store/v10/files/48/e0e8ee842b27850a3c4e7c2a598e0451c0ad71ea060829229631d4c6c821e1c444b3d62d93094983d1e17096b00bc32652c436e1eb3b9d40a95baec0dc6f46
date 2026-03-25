"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computedVueSfc = computedVueSfc;
const alien_signals_1 = require("alien-signals");
function computedVueSfc(plugins, fileName, languageId, getSnapshot) {
    let cache;
    return (0, alien_signals_1.computed)(() => {
        // incremental update
        if (cache?.plugin.updateSFC) {
            const change = getSnapshot().getChangeRange(cache.snapshot);
            if (change) {
                const newSfc = cache.plugin.updateSFC(cache.sfc, {
                    start: change.span.start,
                    end: change.span.start + change.span.length,
                    newText: getSnapshot().getText(change.span.start, change.span.start + change.newLength),
                });
                if (newSfc) {
                    cache.snapshot = getSnapshot();
                    // force dirty
                    cache.sfc = JSON.parse(JSON.stringify(newSfc));
                    return cache.sfc;
                }
            }
        }
        for (const plugin of plugins) {
            const sfc = plugin.parseSFC?.(fileName, getSnapshot().getText(0, getSnapshot().getLength()))
                ?? plugin.parseSFC2?.(fileName, languageId, getSnapshot().getText(0, getSnapshot().getLength()));
            if (sfc) {
                if (!sfc.errors.length) {
                    cache = {
                        snapshot: getSnapshot(),
                        sfc,
                        plugin,
                    };
                }
                return sfc;
            }
        }
    });
}
//# sourceMappingURL=computedVueSfc.js.map