"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computedSfc = computedSfc;
const alien_signals_1 = require("alien-signals");
const parseCssClassNames_1 = require("../utils/parseCssClassNames");
const parseCssVars_1 = require("../utils/parseCssVars");
const signals_1 = require("../utils/signals");
function computedSfc(ts, plugins, fileName, getSnapshot, getParseResult) {
    const getUntrackedSnapshot = () => {
        (0, alien_signals_1.pauseTracking)();
        const res = getSnapshot();
        (0, alien_signals_1.resumeTracking)();
        return res;
    };
    const getContent = (0, alien_signals_1.computed)(() => {
        return getSnapshot().getText(0, getSnapshot().getLength());
    });
    const getComments = (0, alien_signals_1.computed)(oldValue => {
        const newValue = getParseResult()?.descriptor.comments ?? [];
        if (oldValue?.length === newValue.length
            && oldValue?.every((v, i) => v === newValue[i])) {
            return oldValue;
        }
        return newValue;
    });
    const getTemplate = computedNullableSfcBlock('template', 'html', (0, alien_signals_1.computed)(() => getParseResult()?.descriptor.template ?? undefined), (_block, base) => {
        const compiledAst = computedTemplateAst(base);
        return mergeObject(base, {
            get ast() { return compiledAst()?.ast; },
            get errors() { return compiledAst()?.errors; },
            get warnings() { return compiledAst()?.warnings; },
        });
    });
    const getScript = computedNullableSfcBlock('script', 'js', (0, alien_signals_1.computed)(() => getParseResult()?.descriptor.script ?? undefined), (block, base) => {
        const getSrc = computedAttrValue('__src', base, block);
        const getAst = (0, alien_signals_1.computed)(() => {
            for (const plugin of plugins) {
                const ast = plugin.compileSFCScript?.(base.lang, base.content);
                if (ast) {
                    return ast;
                }
            }
            return ts.createSourceFile(fileName + '.' + base.lang, '', 99);
        });
        return mergeObject(base, {
            get src() { return getSrc(); },
            get ast() { return getAst(); },
        });
    });
    const getOriginalScriptSetup = computedNullableSfcBlock('scriptSetup', 'js', (0, alien_signals_1.computed)(() => getParseResult()?.descriptor.scriptSetup ?? undefined), (block, base) => {
        const getGeneric = computedAttrValue('__generic', base, block);
        const getAst = (0, alien_signals_1.computed)(() => {
            for (const plugin of plugins) {
                const ast = plugin.compileSFCScript?.(base.lang, base.content);
                if (ast) {
                    return ast;
                }
            }
            return ts.createSourceFile(fileName + '.' + base.lang, '', 99);
        });
        return mergeObject(base, {
            get generic() { return getGeneric(); },
            get ast() { return getAst(); },
        });
    });
    const hasScript = (0, alien_signals_1.computed)(() => !!getParseResult()?.descriptor.script);
    const hasScriptSetup = (0, alien_signals_1.computed)(() => !!getParseResult()?.descriptor.scriptSetup);
    const getScriptSetup = (0, alien_signals_1.computed)(() => {
        if (!hasScript() && !hasScriptSetup()) {
            //#region monkey fix: https://github.com/vuejs/language-tools/pull/2113
            return {
                content: '',
                lang: 'ts',
                name: '',
                start: 0,
                end: 0,
                startTagEnd: 0,
                endTagStart: 0,
                generic: undefined,
                genericOffset: 0,
                attrs: {},
                ast: ts.createSourceFile('', '', 99, false, ts.ScriptKind.TS),
            };
        }
        return getOriginalScriptSetup();
    });
    const styles = (0, signals_1.computedArray)((0, alien_signals_1.computed)(() => getParseResult()?.descriptor.styles ?? []), (getBlock, i) => {
        const base = computedSfcBlock('style_' + i, 'css', getBlock);
        const getModule = computedAttrValue('__module', base, getBlock);
        const getScoped = (0, alien_signals_1.computed)(() => !!getBlock().scoped);
        const getCssVars = (0, alien_signals_1.computed)(() => [...(0, parseCssVars_1.parseCssVars)(base.content)]);
        const getClassNames = (0, alien_signals_1.computed)(() => [...(0, parseCssClassNames_1.parseCssClassNames)(base.content)]);
        return () => mergeObject(base, {
            get module() { return getModule(); },
            get scoped() { return getScoped(); },
            get cssVars() { return getCssVars(); },
            get classNames() { return getClassNames(); },
        });
    });
    const customBlocks = (0, signals_1.computedArray)((0, alien_signals_1.computed)(() => getParseResult()?.descriptor.customBlocks ?? []), (getBlock, i) => {
        const base = computedSfcBlock('custom_block_' + i, 'txt', getBlock);
        const getType = (0, alien_signals_1.computed)(() => getBlock().type);
        return () => mergeObject(base, {
            get type() { return getType(); },
        });
    });
    return {
        get content() { return getContent(); },
        get comments() { return getComments(); },
        get template() { return getTemplate(); },
        get script() { return getScript(); },
        get scriptSetup() { return getScriptSetup(); },
        get styles() { return styles; },
        get customBlocks() { return customBlocks; },
    };
    function computedTemplateAst(base) {
        let cache;
        return (0, alien_signals_1.computed)(() => {
            if (cache?.template === base.content) {
                return {
                    errors: [],
                    warnings: [],
                    ast: cache?.result.ast,
                };
            }
            // incremental update
            if (cache?.plugin.updateSFCTemplate) {
                const change = getUntrackedSnapshot().getChangeRange(cache.snapshot);
                if (change) {
                    (0, alien_signals_1.pauseTracking)();
                    const templateOffset = base.startTagEnd;
                    (0, alien_signals_1.resumeTracking)();
                    const newText = getUntrackedSnapshot().getText(change.span.start, change.span.start + change.newLength);
                    const newResult = cache.plugin.updateSFCTemplate(cache.result, {
                        start: change.span.start - templateOffset,
                        end: change.span.start + change.span.length - templateOffset,
                        newText,
                    });
                    if (newResult) {
                        cache.template = base.content;
                        cache.snapshot = getUntrackedSnapshot();
                        cache.result = newResult;
                        return {
                            errors: [],
                            warnings: [],
                            ast: newResult.ast,
                        };
                    }
                }
            }
            const errors = [];
            const warnings = [];
            let options = {
                onError: (err) => errors.push(err),
                onWarn: (err) => warnings.push(err),
                expressionPlugins: ['typescript'],
            };
            for (const plugin of plugins) {
                if (plugin.resolveTemplateCompilerOptions) {
                    options = plugin.resolveTemplateCompilerOptions(options);
                }
            }
            for (const plugin of plugins) {
                let result;
                try {
                    result = plugin.compileSFCTemplate?.(base.lang, base.content, options);
                }
                catch (e) {
                    const err = e;
                    errors.push(err);
                }
                if (result || errors.length) {
                    if (result && !errors.length && !warnings.length) {
                        cache = {
                            template: base.content,
                            snapshot: getUntrackedSnapshot(),
                            result: result,
                            plugin,
                        };
                    }
                    else {
                        cache = undefined;
                    }
                    return {
                        errors,
                        warnings,
                        ast: result?.ast,
                    };
                }
            }
            return {
                errors,
                warnings,
                ast: undefined,
            };
        });
    }
    function computedNullableSfcBlock(name, defaultLang, getBlock, resolve) {
        const hasBlock = (0, alien_signals_1.computed)(() => !!getBlock());
        return (0, alien_signals_1.computed)(() => {
            if (!hasBlock()) {
                return;
            }
            const _block = (0, alien_signals_1.computed)(() => getBlock());
            return resolve(_block, computedSfcBlock(name, defaultLang, _block));
        });
    }
    function computedSfcBlock(name, defaultLang, getBlock) {
        const getLang = (0, alien_signals_1.computed)(() => getBlock().lang ?? defaultLang);
        const getAttrs = (0, alien_signals_1.computed)(() => getBlock().attrs); // TODO: computed it
        const getContent = (0, alien_signals_1.computed)(() => getBlock().content);
        const getStartTagEnd = (0, alien_signals_1.computed)(() => getBlock().loc.start.offset);
        const getEndTagStart = (0, alien_signals_1.computed)(() => getBlock().loc.end.offset);
        const getStart = (0, alien_signals_1.computed)(() => getUntrackedSnapshot().getText(0, getStartTagEnd()).lastIndexOf('<' + getBlock().type));
        const getEnd = (0, alien_signals_1.computed)(() => getEndTagStart() + getUntrackedSnapshot().getText(getEndTagStart(), getUntrackedSnapshot().getLength()).indexOf('>') + 1);
        return {
            name,
            get lang() { return getLang(); },
            get attrs() { return getAttrs(); },
            get content() { return getContent(); },
            get startTagEnd() { return getStartTagEnd(); },
            get endTagStart() { return getEndTagStart(); },
            get start() { return getStart(); },
            get end() { return getEnd(); },
        };
    }
    function computedAttrValue(key, base, getBlock) {
        return (0, alien_signals_1.computed)(() => {
            const val = getBlock()[key];
            if (typeof val === 'object') {
                return {
                    ...val,
                    offset: base.start + val.offset,
                };
            }
            return val;
        });
    }
}
function mergeObject(a, b) {
    return Object.defineProperties(a, Object.getOwnPropertyDescriptors(b));
}
//# sourceMappingURL=computedSfc.js.map