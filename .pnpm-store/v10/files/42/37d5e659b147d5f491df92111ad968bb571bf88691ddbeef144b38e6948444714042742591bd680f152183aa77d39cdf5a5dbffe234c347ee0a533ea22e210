"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTranslatorContext = exports.isTranslatorConfig = exports.TranslatorCollection = exports.PostProcessResult = void 0;
var PostProcessResult;
(function (PostProcessResult) {
    PostProcessResult[PostProcessResult["NoChange"] = 0] = "NoChange";
    PostProcessResult[PostProcessResult["RemoveNode"] = 1] = "RemoveNode";
})(PostProcessResult = exports.PostProcessResult || (exports.PostProcessResult = {}));
// endregion
/* ****************************************************************************************************************** */
// region: TranslatorCollection
/* ****************************************************************************************************************** */
class TranslatorCollection {
    get size() { return Object.keys(this).length; }
    /**
     * Add / update translator config for one or more element tags
     */
    set(keys, config, /* @internal */ preserveBase) {
        keys.split(',').forEach(el => {
            el = el.toUpperCase();
            let res = config;
            if (preserveBase) {
                const base = this[el];
                if ((0, exports.isTranslatorConfig)(base))
                    res = !(0, exports.isTranslatorConfig)(config)
                        ? Object.assign((...args) => config.apply(void 0, args), { base })
                        : Object.assign(Object.assign({}, base), config);
            }
            this[el] = res;
        });
    }
    /**
     * Get translator config for element tag
     */
    get(key) {
        return this[key.toUpperCase()];
    }
    /**
     * Returns array of entries
     */
    entries() {
        return Object.entries(this);
    }
    /**
     * Remove translator config for one or more element tags
     */
    remove(keys) {
        keys.split(',').forEach(el => delete this[el.toUpperCase()]);
    }
}
exports.TranslatorCollection = TranslatorCollection;
// endregion
/* ****************************************************************************************************************** */
// region: Utilities
/* ****************************************************************************************************************** */
/**
 * Only use to narrow union of types where only TranslatorConfig has JS type 'object'
 */
const isTranslatorConfig = (v) => typeof v === 'object';
exports.isTranslatorConfig = isTranslatorConfig;
function createTranslatorContext(visitor, node, metadata, base) {
    const { instance, nodeMetadata, } = visitor;
    return Object.assign({ node, options: instance.options, parent: node.parentNode, nodeMetadata,
        visitor,
        base }, metadata);
}
exports.createTranslatorContext = createTranslatorContext;
// endregion
//# sourceMappingURL=translator.js.map