"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tsCodegen = void 0;
const shared_1 = require("@vue/shared");
const alien_signals_1 = require("alien-signals");
const path = require("path-browserify");
const script_1 = require("../codegen/script");
const template_1 = require("../codegen/template");
const scriptRanges_1 = require("../parsers/scriptRanges");
const scriptSetupRanges_1 = require("../parsers/scriptSetupRanges");
const vueCompilerOptions_1 = require("../parsers/vueCompilerOptions");
const signals_1 = require("../utils/signals");
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
            const codegen = useCodegen(fileName, sfc);
            const files = [];
            if (['js', 'ts', 'jsx', 'tsx'].includes(codegen.getLang())) {
                files.push({ id: 'script_' + codegen.getLang(), lang: codegen.getLang() });
            }
            return files;
        },
        resolveEmbeddedCode(fileName, sfc, embeddedFile) {
            if (/script_(js|jsx|ts|tsx)/.test(embeddedFile.id)) {
                const codegen = useCodegen(fileName, sfc);
                const tsx = codegen.getGeneratedScript();
                if (tsx) {
                    embeddedFile.content = [...tsx.codes];
                }
            }
        },
    };
    function useCodegen(fileName, sfc) {
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
function createTsx(fileName, sfc, ctx, appendGlobalTypes) {
    const ts = ctx.modules.typescript;
    const getLang = (0, alien_signals_1.computed)(() => {
        return !sfc.script && !sfc.scriptSetup ? 'ts'
            : sfc.scriptSetup && sfc.scriptSetup.lang !== 'js' ? sfc.scriptSetup.lang
                : sfc.script && sfc.script.lang !== 'js' ? sfc.script.lang
                    : 'js';
    });
    const getResolvedOptions = (0, alien_signals_1.computed)(() => {
        const options = (0, vueCompilerOptions_1.parseVueCompilerOptions)(sfc.comments);
        if (options) {
            const resolver = new ts_1.CompilerOptionsResolver();
            resolver.addConfig(options, path.dirname(fileName));
            return resolver.build(ctx.vueCompilerOptions);
        }
        return ctx.vueCompilerOptions;
    });
    const getScriptRanges = (0, alien_signals_1.computed)(() => sfc.script
        ? (0, scriptRanges_1.parseScriptRanges)(ts, sfc.script.ast, !!sfc.scriptSetup, false)
        : undefined);
    const getScriptSetupRanges = (0, alien_signals_1.computed)(() => sfc.scriptSetup
        ? (0, scriptSetupRanges_1.parseScriptSetupRanges)(ts, sfc.scriptSetup.ast, getResolvedOptions())
        : undefined);
    const getSetupBindingNames = (0, signals_1.computedSet)((0, alien_signals_1.computed)(() => {
        const newNames = new Set();
        const bindings = getScriptSetupRanges()?.bindings;
        if (sfc.scriptSetup && bindings) {
            for (const { range } of bindings) {
                newNames.add(sfc.scriptSetup.content.slice(range.start, range.end));
            }
        }
        return newNames;
    }));
    const getSetupImportComponentNames = (0, signals_1.computedSet)((0, alien_signals_1.computed)(() => {
        const newNames = new Set();
        const bindings = getScriptSetupRanges()?.bindings;
        if (sfc.scriptSetup && bindings) {
            for (const { range, moduleName, isDefaultImport, isNamespace } of bindings) {
                if (moduleName
                    && isDefaultImport
                    && !isNamespace
                    && ctx.vueCompilerOptions.extensions.some(ext => moduleName.endsWith(ext))) {
                    newNames.add(sfc.scriptSetup.content.slice(range.start, range.end));
                }
            }
        }
        return newNames;
    }));
    const getSetupDestructuredPropNames = (0, signals_1.computedSet)((0, alien_signals_1.computed)(() => {
        const newNames = new Set(getScriptSetupRanges()?.defineProps?.destructured?.keys());
        const rest = getScriptSetupRanges()?.defineProps?.destructuredRest;
        if (rest) {
            newNames.add(rest);
        }
        return newNames;
    }));
    const getSetupTemplateRefNames = (0, signals_1.computedSet)((0, alien_signals_1.computed)(() => {
        const newNames = new Set(getScriptSetupRanges()?.useTemplateRef
            .map(({ name }) => name)
            .filter(name => name !== undefined));
        return newNames;
    }));
    const setupHasDefineSlots = (0, alien_signals_1.computed)(() => !!getScriptSetupRanges()?.defineSlots);
    const getSetupSlotsAssignName = (0, alien_signals_1.computed)(() => getScriptSetupRanges()?.defineSlots?.name);
    const getSetupPropsAssignName = (0, alien_signals_1.computed)(() => getScriptSetupRanges()?.defineProps?.name);
    const getSetupInheritAttrs = (0, alien_signals_1.computed)(() => {
        const value = getScriptSetupRanges()?.defineOptions?.inheritAttrs ?? getScriptRanges()?.exportDefault?.inheritAttrsOption;
        return value !== 'false';
    });
    const getComponentSelfName = (0, alien_signals_1.computed)(() => {
        const { exportDefault } = getScriptRanges() ?? {};
        if (sfc.script && exportDefault?.nameOption) {
            const { nameOption } = exportDefault;
            return sfc.script.content.slice(nameOption.start + 1, nameOption.end - 1);
        }
        const { defineOptions } = getScriptSetupRanges() ?? {};
        if (sfc.scriptSetup && defineOptions?.name) {
            return defineOptions.name;
        }
        const baseName = path.basename(fileName);
        return (0, shared_1.capitalize)((0, shared_1.camelize)(baseName.slice(0, baseName.lastIndexOf('.'))));
    });
    const getGeneratedTemplate = (0, alien_signals_1.computed)(() => {
        if (getResolvedOptions().skipTemplateCodegen || !sfc.template) {
            return;
        }
        const codes = [];
        const codegen = (0, template_1.generateTemplate)({
            ts,
            compilerOptions: ctx.compilerOptions,
            vueCompilerOptions: getResolvedOptions(),
            template: sfc.template,
            edited: getResolvedOptions().__test || (fileEditTimes.get(fileName) ?? 0) >= 2,
            scriptSetupBindingNames: getSetupBindingNames(),
            scriptSetupImportComponentNames: getSetupImportComponentNames(),
            destructuredPropNames: getSetupDestructuredPropNames(),
            templateRefNames: getSetupTemplateRefNames(),
            hasDefineSlots: setupHasDefineSlots(),
            slotsAssignName: getSetupSlotsAssignName(),
            propsAssignName: getSetupPropsAssignName(),
            inheritAttrs: getSetupInheritAttrs(),
            selfComponentName: getComponentSelfName(),
        });
        let current = codegen.next();
        while (!current.done) {
            const code = current.value;
            codes.push(code);
            current = codegen.next();
        }
        return {
            ...current.value,
            codes,
        };
    });
    const getGeneratedScript = (0, alien_signals_1.computed)(() => {
        const codes = [];
        const codegen = (0, script_1.generateScript)({
            ts,
            compilerOptions: ctx.compilerOptions,
            vueCompilerOptions: getResolvedOptions(),
            sfc: sfc,
            edited: getResolvedOptions().__test || (fileEditTimes.get(fileName) ?? 0) >= 2,
            fileName,
            lang: getLang(),
            scriptRanges: getScriptRanges(),
            scriptSetupRanges: getScriptSetupRanges(),
            templateCodegen: getGeneratedTemplate(),
            destructuredPropNames: getSetupDestructuredPropNames(),
            templateRefNames: getSetupTemplateRefNames(),
            appendGlobalTypes,
        });
        fileEditTimes.set(fileName, (fileEditTimes.get(fileName) ?? 0) + 1);
        let current = codegen.next();
        while (!current.done) {
            const code = current.value;
            codes.push(code);
            current = codegen.next();
        }
        return {
            ...current.value,
            codes,
        };
    });
    return {
        getScriptRanges,
        getScriptSetupRanges,
        getLang,
        getGeneratedScript,
        getGeneratedTemplate,
    };
}
//# sourceMappingURL=vue-tsx.js.map