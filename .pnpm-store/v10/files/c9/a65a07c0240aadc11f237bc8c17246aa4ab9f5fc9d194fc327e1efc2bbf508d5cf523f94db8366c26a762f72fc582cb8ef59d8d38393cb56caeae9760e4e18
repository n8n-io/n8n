"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tsCodegen = void 0;
const alien_signals_1 = require("alien-signals");
const script_1 = require("../codegen/script");
const template_1 = require("../codegen/template");
const scriptRanges_1 = require("../parsers/scriptRanges");
const scriptSetupRanges_1 = require("../parsers/scriptSetupRanges");
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
                    const content = [...tsx.codes];
                    embeddedFile.content = content;
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
    const scriptRanges = (0, alien_signals_1.computed)(() => _sfc.script
        ? (0, scriptRanges_1.parseScriptRanges)(ts, _sfc.script.ast, !!_sfc.scriptSetup, false)
        : undefined);
    const scriptSetupRanges = (0, alien_signals_1.computed)(() => _sfc.scriptSetup
        ? (0, scriptSetupRanges_1.parseScriptSetupRanges)(ts, _sfc.scriptSetup.ast, ctx.vueCompilerOptions)
        : undefined);
    const generatedTemplate = (0, alien_signals_1.computed)(() => {
        if (ctx.vueCompilerOptions.skipTemplateCodegen || !_sfc.template) {
            return;
        }
        const codes = [];
        const codegen = (0, template_1.generateTemplate)({
            ts,
            compilerOptions: ctx.compilerOptions,
            vueCompilerOptions: ctx.vueCompilerOptions,
            template: _sfc.template,
            edited: ctx.vueCompilerOptions.__test || (fileEditTimes.get(fileName) ?? 0) >= 2,
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
    const scriptSetupBindingNames = (0, alien_signals_1.computed)(oldNames => {
        const newNames = new Set();
        const bindings = scriptSetupRanges.get()?.bindings;
        if (_sfc.scriptSetup && bindings) {
            for (const binding of bindings) {
                newNames.add(_sfc.scriptSetup?.content.substring(binding.start, binding.end));
            }
        }
        if (newNames && oldNames && twoSetsEqual(newNames, oldNames)) {
            return oldNames;
        }
        return newNames;
    });
    const scriptSetupImportComponentNames = (0, alien_signals_1.computed)(oldNames => {
        const newNames = scriptSetupRanges.get()?.importComponentNames ?? new Set();
        if (oldNames && twoSetsEqual(newNames, oldNames)) {
            return oldNames;
        }
        return newNames;
    });
    const destructuredPropNames = (0, alien_signals_1.computed)(oldNames => {
        const newNames = scriptSetupRanges.get()?.props.destructured ?? new Set();
        const rest = scriptSetupRanges.get()?.props.destructuredRest;
        if (rest) {
            newNames.add(rest);
        }
        if (oldNames && twoSetsEqual(newNames, oldNames)) {
            return oldNames;
        }
        return newNames;
    });
    const templateRefNames = (0, alien_signals_1.computed)(oldNames => {
        const newNames = new Set(scriptSetupRanges.get()?.templateRefs
            .map(({ name }) => name)
            .filter(name => name !== undefined));
        if (oldNames && twoSetsEqual(newNames, oldNames)) {
            return oldNames;
        }
        return newNames;
    });
    const hasDefineSlots = (0, alien_signals_1.computed)(() => !!scriptSetupRanges.get()?.slots.define);
    const slotsAssignName = (0, alien_signals_1.computed)(() => scriptSetupRanges.get()?.slots.name);
    const propsAssignName = (0, alien_signals_1.computed)(() => scriptSetupRanges.get()?.props.name);
    const inheritAttrs = (0, alien_signals_1.computed)(() => {
        const value = scriptSetupRanges.get()?.options.inheritAttrs ?? scriptRanges.get()?.exportDefault?.inheritAttrsOption;
        return value !== 'false';
    });
    const generatedScript = (0, alien_signals_1.computed)(() => {
        const codes = [];
        const linkedCodeMappings = [];
        let generatedLength = 0;
        const codegen = (0, script_1.generateScript)({
            ts,
            fileName,
            sfc: _sfc,
            lang: lang.get(),
            scriptRanges: scriptRanges.get(),
            scriptSetupRanges: scriptSetupRanges.get(),
            templateCodegen: generatedTemplate.get(),
            compilerOptions: ctx.compilerOptions,
            vueCompilerOptions: ctx.vueCompilerOptions,
            edited: ctx.vueCompilerOptions.__test || (fileEditTimes.get(fileName) ?? 0) >= 2,
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
function twoSetsEqual(a, b) {
    if (a.size !== b.size) {
        return false;
    }
    for (const file of a) {
        if (!b.has(file)) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=vue-tsx.js.map