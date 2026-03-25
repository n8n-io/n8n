"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVBindShorthandInlayHintInfo = createVBindShorthandInlayHintInfo;
function createVBindShorthandInlayHintInfo(loc, variableName) {
    return {
        blockName: 'template',
        offset: loc.end.offset,
        setting: 'vue.inlayHints.vBindShorthand',
        label: `="${variableName}"`,
        tooltip: [
            `This is a shorthand for \`${loc.source}="${variableName}"\`.`,
            'To hide this hint, set `vue.inlayHints.vBindShorthand` to `false` in IDE settings.',
            '[More info](https://github.com/vuejs/core/pull/9451)',
        ].join('\n\n'),
    };
}
//# sourceMappingURL=inlayHints.js.map