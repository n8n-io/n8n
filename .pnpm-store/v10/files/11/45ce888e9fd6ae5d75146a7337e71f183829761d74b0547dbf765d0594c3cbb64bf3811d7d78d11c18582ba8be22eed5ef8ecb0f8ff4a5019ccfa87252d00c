"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tsCodegen = void 0;
const alien_signals_1 = require("alien-signals");
const script_1 = require("../codegen/script");
const template_1 = require("../codegen/template");
const scriptRanges_1 = require("../parsers/scriptRanges");
const scriptSetupRanges_1 = require("../parsers/scriptSetupRanges");
const vueCompilerOptions_1 = require("../parsers/vueCompilerOptions");
const ts_1 = require("../utils/ts");
exports.tsCodegen = new WeakMap();
const fileEditTimes = new Map();
const plugin = ctx => {
    let appendedGlobalTypes = false;
    return {
        version: 2.1,
        requiredCompilerOptions: [
            'noPropertyAccessFromIndexSignature',
            'exactOptionalPropertyTypes',
        ],
        getEmbeddedCodes(fileName, sfc) {
            const tsx = useTsx(fileName, sfc);
            const files = [];
            if (['js', 'ts', 'jsx', 'tsx'].includes(tsx.lang.get())) {
                files.push({ id: 'script_' + tsx.lang.get(), lang: tsx.lang.get() });
            }
            return files;
        },
        resolveEmbeddedCode(fileName, sfc, embeddedFile) {
            const _tsx = useTsx(fileName, sfc);
            if (/script_(js|jsx|ts|tsx)/.test(embeddedFile.id)) {
                const tsx = _tsx.generatedScript.get();
                if (tsx) {
                    embeddedFile.content = [...tsx.codes];
                    embeddedFile.linkedCodeMappings = [...tsx.linkedCodeMappings];
                }
            }
        },
    };
    function useTsx(fileName, sfc) {
        if (!exports.tsCodegen.has(sfc)) {
            let appendGlobalTypes = false;
            if (!ctx.vueCompilerOptions.__setupedGlobalTypes && !appendedGlobalTypes) {
                appendGlobalTypes = true;
                appendedGlobalTypes = true;
            }
            exports.tsCodegen.set(sfc, createTsx(fileName, sfc, ctx, appendGlobalTypes));
        }
        return exports.tsCodegen.get(sfc);
    }
};
exports.default = plugin;
function createTsx(fileName, _sfc, ctx, appendGlobalTypes) {
    const ts = ctx.modules.typescript;
    const lang = (0, alien_signals_1.computed)(() => {
        return !_sfc.script && !_sfc.scriptSetup ? 'ts'
            : _sfc.scriptSetup && _sfc.scriptSetup.lang !== 'js' ? _sfc.scriptSetup.lang
                : _sfc.script && _sfc.script.lang !== 'js' ? _sfc.script.lang
                    : 'js';
    });
    const vueCompilerOptions = (0, alien_signals_1.computed)(() => {
        const options = (0, vueCompilerOptions_1.parseVueCompilerOptions)(_sfc.comments);
        return options
            ? (0, ts_1.resolveVueCompilerOptions)(options, ctx.vueCompilerOptions)
            : ctx.vueCompilerOptions;
    });
    const scriptRanges = (0, alien_signals_1.computed)(() => _sfc.script
        ? (0, scriptRanges_1.parseScriptRanges)(ts, _sfc.script.ast, !!_sfc.scriptSetup, false)
        : undefined);
    const scriptSetupRanges = (0, alien_signals_1.computed)(() => _sfc.scriptSetup
        ? (0, scriptSetupRanges_1.parseScriptSetupRanges)(ts, _sfc.scriptSetup.ast, vueCompilerOptions.get())
        : undefined);
    const scriptSetupBindingNames = alien_signals_1.unstable.computedSet((0, alien_signals_1.computed)(() => {
        const newNames = new Set();
        const bindings = scriptSetupRanges.get()?.bindings;
        if (_sfc.scriptSetup && bindings) {
            for (const { range } of bindings) {
                newNames.add(_sfc.scriptSetup.content.slice(range.start, range.end));
            }
        }
        return newNames;
    }));
    const scriptSetupImportComponentNames = alien_signals_1.unstable.computedSet((0, alien_signals_1.computed)(() => {
        const newNames = new Set();
        const bindings = scriptSetupRanges.get()?.bindings;
        if (_sfc.scriptSetup && bindings) {
            for (const { range, moduleName, isDefaultImport, isNamespace } of bindings) {
                if (moduleName
                    && isDefaultImport
                    && !isNamespace
                    && ctx.vueCompilerOptions.extensions.some(ext => moduleName.endsWith(ext))) {
                    newNames.add(_sfc.scriptSetup.content.slice(range.start, range.end));
                }
            }
        }
        return newNames;
    }));
    const destructuredPropNames = alien_signals_1.unstable.computedSet((0, alien_signals_1.computed)(() => {
        const newNames = new Set(scriptSetupRanges.get()?.defineProps?.destructured);
        const rest = scriptSetupRanges.get()?.defineProps?.destructuredRest;
        if (rest) {
            newNames.add(rest);
        }
        return newNames;
    }));
    const templateRefNames = alien_signals_1.unstable.computedSet((0, alien_signals_1.computed)(() => {
        const newNames = new Set(scriptSetupRanges.get()?.useTemplateRef
            .map(({ name }) => name)
            .filter(name => name !== undefined));
        return newNames;
    }));
    const hasDefineSlots = (0, alien_signals_1.computed)(() => !!scriptSetupRanges.get()?.defineSlots);
    const slotsAssignName = (0, alien_signals_1.computed)(() => scriptSetupRanges.get()?.defineSlots?.name);
    const propsAssignName = (0, alien_signals_1.computed)(() => scriptSetupRanges.get()?.defineProps?.name);
    const inheritAttrs = (0, alien_signals_1.computed)(() => {
        const value = scriptSetupRanges.get()?.defineOptions?.inheritAttrs ?? scriptRanges.get()?.exportDefault?.inheritAttrsOption;
        return value !== 'false';
    });
    const generatedTemplate = (0, alien_signals_1.computed)(() => {
        if (vueCompilerOptions.get().skipTemplateCodegen || !_sfc.template) {
            return;
        }
        const codes = [];
        const codegen = (0, template_1.generateTemplate)({
            ts,
            compilerOptions: ctx.compilerOptions,
            vueCompilerOptions: vueCompilerOptions.get(),
            template: _sfc.template,
            edited: vueCompilerOptions.get().__test || (fileEditTimes.get(fileName) ?? 0) >= 2,
            scriptSetupBindingNames: scriptSetupBindingNames.get(),
            scriptSetupImportComponentNames: scriptSetupImportComponentNames.get(),
            destructuredPropNames: destructuredPropNames.get(),
            templateRefNames: templateRefNames.get(),
            hasDefineSlots: hasDefineSlots.get(),
            slotsAssignName: slotsAssignName.get(),
            propsAssignName: propsAssignName.get(),
            inheritAttrs: inheritAttrs.get(),
        });
        let current = codegen.next();
        while (!current.done) {
            const code = current.value;
            codes.push(code);
            current = codegen.next();
        }
        return {
            ...current.value,
            codes: codes,
        };
    });
    const generatedScript = (0, alien_signals_1.computed)(() => {
        const codes = [];
        const linkedCodeMappings = [];
        let generatedLength = 0;
        const codegen = (0, script_1.generateScript)({
            ts,
            compilerOptions: ctx.compilerOptions,
            vueCompilerOptions: vueCompilerOptions.get(),
            sfc: _sfc,
            edited: vueCompilerOptions.get().__test || (fileEditTimes.get(fileName) ?? 0) >= 2,
            fileName,
            lang: lang.get(),
            scriptRanges: scriptRanges.get(),
            scriptSetupRanges: scriptSetupRanges.get(),
            templateCodegen: generatedTemplate.get(),
            destructuredPropNames: destructuredPropNames.get(),
            templateRefNames: templateRefNames.get(),
            getGeneratedLength: () => generatedLength,
            linkedCodeMappings,
            appendGlobalTypes,
        });
        fileEditTimes.set(fileName, (fileEditTimes.get(fileName) ?? 0) + 1);
        let current = codegen.next();
        while (!current.done) {
            const code = current.value;
            codes.push(code);
            generatedLength += typeof code === 'string'
                ? code.length
                : code[0].length;
            current = codegen.next();
        }
        return {
            ...current.value,
            codes,
            linkedCodeMappings,
        };
    });
    return {
        scriptRanges,
        scriptSetupRanges,
        lang,
        generatedScript,
        generatedTemplate,
    };
}
//# sourceMappingURL=vue-tsx.js.map