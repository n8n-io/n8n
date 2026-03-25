"use strict";
/**
 * Created by user on 2018/3/18/018.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixToc = void 0;
function fixToc(epub) {
    let manifest_keys = Object.keys(epub.manifest);
    if (!epub.toc.length) {
        epub.toc = Object.values(epub.manifest).filter(node => {
            if (['text/css', 'application/x-dtbncx+xml'].includes(node.mediaType)
                || /^(image)/.test(node.mediaType)) {
                return false;
            }
            return true;
        });
        return epub;
    }
    epub.toc.forEach(function (toc, idx) {
        if (!epub.manifest[toc.id]) {
            for (let k of manifest_keys) {
                let row = epub.manifest[k];
                if ((row.href == toc.href) || (row.href.replace(/#.+$/g, '') == toc.href.replace(/#.+$/g, ''))) {
                    toc.id = k;
                }
            }
        }
    });
    return epub;
}
exports.fixToc = fixToc;
//# sourceMappingURL=toc.js.map