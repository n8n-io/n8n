"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computedVueSfc = computedVueSfc;
const alien_signals_1 = require("alien-signals");
function computedVueSfc(plugins, fileName, languageId, snapshot) {
    let cache;
    return (0, alien_signals_1.computed)(() => {
        // incremental update
        if (cache?.plugin.updateSFC) {
            const change = snapshot.get().getChangeRange(cache.snapshot);
            if (change) {
                const newSfc = cache.plugin.updateSFC(cache.sfc, {
                    start: change.span.start,
                    end: change.span.start + change.span.length,
                    newText: snapshot.get().getText(change.span.start, change.span.start + change.newLength),
                });
                if (newSfc) {
                    cache.snapshot = snapshot.get();
                    // force dirty
                    cache.sfc = JSON.parse(JSON.stringify(newSfc));
                    return cache.sfc;
                }
            }
        }
        for (const plugin of plugins) {
            const sfc = plugin.parseSFC?.(fileName, snapshot.get().getText(0, snapshot.get().getLength()))
                ?? plugin.parseSFC2?.(fileName, languageId, snapshot.get().getText(0, snapshot.get().getLength()));
            if (sfc) {
                if (!sfc.errors.length) {
                    cache = {
                        snapshot: snapshot.get(),
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