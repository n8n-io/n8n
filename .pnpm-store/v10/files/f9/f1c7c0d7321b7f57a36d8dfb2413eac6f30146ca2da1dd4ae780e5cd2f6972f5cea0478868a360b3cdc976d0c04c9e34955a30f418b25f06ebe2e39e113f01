"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computedSfc = computedSfc;
const alien_signals_1 = require("alien-signals");
const parseCssClassNames_1 = require("../utils/parseCssClassNames");
const parseCssVars_1 = require("../utils/parseCssVars");
function computedSfc(ts, plugins, fileName, snapshot, parsed) {
    const untrackedSnapshot = () => {
        const prevSub = alien_signals_1.activeSub;
        const prevTrackId = alien_signals_1.activeTrackId;
        (0, alien_signals_1.setActiveSub)(undefined, 0);
        const res = snapshot.get();
        (0, alien_signals_1.setActiveSub)(prevSub, prevTrackId);
        return res;
    };
    const content = (0, alien_signals_1.computed)(() => {
        return snapshot.get().getText(0, snapshot.get().getLength());
    });
    const comments = (0, alien_signals_1.computed)(oldValue => {
        const newValue = parsed.get()?.descriptor.comments ?? [];
        if (oldValue?.length === newValue.length
            && oldValue.every((v, i) => v === newValue[i])) {
            return oldValue;
        }
        return newValue;
    });
    const template = computedNullableSfcBlock('template', 'html', (0, alien_signals_1.computed)(() => parsed.get()?.descriptor.template ?? undefined), (_block, base) => {
        const compiledAst = computedTemplateAst(base);
        return mergeObject(base, {
            get ast() { return compiledAst.get()?.ast; },
            get errors() { return compiledAst.get()?.errors; },
            get warnings() { return compiledAst.get()?.warnings; },
        });
    });
    const script = computedNullableSfcBlock('script', 'js', (0, alien_signals_1.computed)(() => parsed.get()?.descriptor.script ?? undefined), (block, base) => {
        const src = (0, alien_signals_1.computed)(() => block.get().src);
        const srcOffset = (0, alien_signals_1.computed)(() => {
            const _src = src.get();
            return _src ? untrackedSnapshot().getText(0, base.startTagEnd).lastIndexOf(_src) - base.startTagEnd : -1;
        });
        const ast = (0, alien_signals_1.computed)(() => {
            for (const plugin of plugins) {
                const ast = plugin.compileSFCScript?.(base.lang, base.content);
                if (ast) {
                    return ast;
                }
            }
            return ts.createSourceFile(fileName + '.' + base.lang, '', 99);
        });
        return mergeObject(base, {
            get src() { return src.get(); },
            get srcOffset() { return srcOffset.get(); },
            get ast() { return ast.get(); },
        });
    });
    const scriptSetupOriginal = computedNullableSfcBlock('scriptSetup', 'js', (0, alien_signals_1.computed)(() => parsed.get()?.descriptor.scriptSetup ?? undefined), (block, base) => {
        const generic = (0, alien_signals_1.computed)(() => {
            const _block = block.get();
            return typeof _block.attrs.generic === 'string' ? _block.attrs.generic : undefined;
        });
        const genericOffset = (0, alien_signals_1.computed)(() => {
            const _generic = generic.get();
            return _generic !== undefined ? untrackedSnapshot().getText(0, base.startTagEnd).lastIndexOf(_generic) - base.startTagEnd : -1;
        });
        const ast = (0, alien_signals_1.computed)(() => {
            for (const plugin of plugins) {
                const ast = plugin.compileSFCScript?.(base.lang, base.content);
                if (ast) {
                    return ast;
                }
            }
            return ts.createSourceFile(fileName + '.' + base.lang, '', 99);
        });
        return mergeObject(base, {
            get generic() { return generic.get(); },
            get genericOffset() { return genericOffset.get(); },
            get ast() { return ast.get(); },
        });
    });
    const hasScript = (0, alien_signals_1.computed)(() => !!parsed.get()?.descriptor.script);
    const hasScriptSetup = (0, alien_signals_1.computed)(() => !!parsed.get()?.descriptor.scriptSetup);
    const scriptSetup = (0, alien_signals_1.computed)(() => {
        if (!hasScript.get() && !hasScriptSetup.get()) {
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
        return scriptSetupOriginal.get();
    });
    const styles = alien_signals_1.unstable.computedArray((0, alien_signals_1.computed)(() => parsed.get()?.descriptor.styles ?? []), (block, i) => {
        const base = computedSfcBlock('style_' + i, 'css', block);
        const module = (0, alien_signals_1.computed)(() => {
            const { __module } = block.get();
            return __module ? {
                name: __module.name,
                offset: __module.offset ? base.start + __module.offset : undefined
            } : undefined;
        });
        const scoped = (0, alien_signals_1.computed)(() => !!block.get().scoped);
        const cssVars = (0, alien_signals_1.computed)(() => [...(0, parseCssVars_1.parseCssVars)(base.content)]);
        const classNames = (0, alien_signals_1.computed)(() => [...(0, parseCssClassNames_1.parseCssClassNames)(base.content)]);
        return () => mergeObject(base, {
            get module() { return module.get(); },
            get scoped() { return scoped.get(); },
            get cssVars() { return cssVars.get(); },
            get classNames() { return classNames.get(); },
        });
    });
    const customBlocks = alien_signals_1.unstable.computedArray((0, alien_signals_1.computed)(() => parsed.get()?.descriptor.customBlocks ?? []), (block, i) => {
        const base = computedSfcBlock('custom_block_' + i, 'txt', block);
        const type = (0, alien_signals_1.computed)(() => block.get().type);
        return () => mergeObject(base, {
            get type() { return type.get(); },
        });
    });
    return {
        get content() { return content.get(); },
        get comments() { return comments.get(); },
        get template() { return template.get(); },
        get script() { return script.get(); },
        get scriptSetup() { return scriptSetup.get(); },
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
                const change = untrackedSnapshot().getChangeRange(cache.snapshot);
                if (change) {
                    const prevSub = alien_signals_1.activeSub;
                    const prevTrackId = alien_signals_1.activeTrackId;
                    (0, alien_signals_1.setActiveSub)(undefined, 0);
                    const templateOffset = base.startTagEnd;
                    (0, alien_signals_1.setActiveSub)(prevSub, prevTrackId);
                    const newText = untrackedSnapshot().getText(change.span.start, change.span.start + change.newLength);
                    const newResult = cache.plugin.updateSFCTemplate(cache.result, {
                        start: change.span.start - templateOffset,
                        end: change.span.start + change.span.length - templateOffset,
                        newText,
                    });
                    if (newResult) {
                        cache.template = base.content;
                        cache.snapshot = untrackedSnapshot();
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
                            snapshot: untrackedSnapshot(),
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
    function computedNullableSfcBlock(name, defaultLang, block, resolve) {
        const hasBlock = (0, alien_signals_1.computed)(() => !!block.get());
        return (0, alien_signals_1.computed)(() => {
            if (!hasBlock.get()) {
                return;
            }
            const _block = (0, alien_signals_1.computed)(() => block.get());
            return resolve(_block, computedSfcBlock(name, defaultLang, _block));
        });
    }
    function computedSfcBlock(name, defaultLang, block) {
        const lang = (0, alien_signals_1.computed)(() => block.get().lang ?? defaultLang);
        const attrs = (0, alien_signals_1.computed)(() => block.get().attrs); // TODO: computed it
        const content = (0, alien_signals_1.computed)(() => block.get().content);
        const startTagEnd = (0, alien_signals_1.computed)(() => block.get().loc.start.offset);
        const endTagStart = (0, alien_signals_1.computed)(() => block.get().loc.end.offset);
        const start = (0, alien_signals_1.computed)(() => untrackedSnapshot().getText(0, startTagEnd.get()).lastIndexOf('<' + block.get().type));
        const end = (0, alien_signals_1.computed)(() => endTagStart.get() + untrackedSnapshot().getText(endTagStart.get(), untrackedSnapshot().getLength()).indexOf('>') + 1);
        return {
            name,
            get lang() { return lang.get(); },
            get attrs() { return attrs.get(); },
            get content() { return content.get(); },
            get startTagEnd() { return startTagEnd.get(); },
            get endTagStart() { return endTagStart.get(); },
            get start() { return start.get(); },
            get end() { return end.get(); },
        };
    }
}
function mergeObject(a, b) {
    return Object.defineProperties(a, Object.getOwnPropertyDescriptors(b));
}
//# sourceMappingURL=computedSfc.js.map