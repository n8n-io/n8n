"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTemplateCodegenContext = createTemplateCodegenContext;
const utils_1 = require("../utils");
const _codeFeatures = {
    all: {
        verification: true,
        completion: true,
        semantic: true,
        navigation: true,
    },
    verification: {
        verification: true,
    },
    completion: {
        completion: true,
    },
    additionalCompletion: {
        completion: { isAdditional: true },
    },
    navigation: {
        navigation: true,
    },
    navigationWithoutRename: {
        navigation: {
            shouldRename() {
                return false;
            },
        },
    },
    navigationAndCompletion: {
        navigation: true,
        completion: true,
    },
    navigationAndAdditionalCompletion: {
        navigation: true,
        completion: { isAdditional: true },
    },
    withoutNavigation: {
        verification: true,
        completion: true,
        semantic: true,
    },
    withoutHighlight: {
        semantic: { shouldHighlight: () => false },
        verification: true,
        navigation: true,
        completion: true,
    },
    withoutHighlightAndCompletion: {
        semantic: { shouldHighlight: () => false },
        verification: true,
        navigation: true,
    },
    withoutHighlightAndCompletionAndNavigation: {
        semantic: { shouldHighlight: () => false },
        verification: true,
    },
};
function createTemplateCodegenContext(options) {
    let ignoredError = false;
    let expectErrorToken;
    let lastGenericComment;
    let variableId = 0;
    const codeFeatures = new Proxy(_codeFeatures, {
        get(target, key) {
            const data = target[key];
            if (data.verification) {
                if (ignoredError) {
                    return {
                        ...data,
                        verification: false,
                    };
                }
                if (expectErrorToken) {
                    const token = expectErrorToken;
                    if (typeof data.verification !== 'object' || !data.verification.shouldReport) {
                        return {
                            ...data,
                            verification: {
                                shouldReport: () => {
                                    token.errors++;
                                    return false;
                                },
                            },
                        };
                    }
                }
            }
            return data;
        },
    });
    const localVars = new Map();
    const accessExternalVariables = new Map();
    const slots = [];
    const dynamicSlots = [];
    const hasSlotElements = new Set();
    ;
    const blockConditions = [];
    const scopedClasses = [];
    const emptyClassOffsets = [];
    const inlayHints = [];
    const bindingAttrLocs = [];
    const inheritedAttrVars = new Set();
    const templateRefs = new Map();
    return {
        slots,
        dynamicSlots,
        codeFeatures,
        accessExternalVariables,
        lastGenericComment,
        hasSlotElements,
        blockConditions,
        scopedClasses,
        emptyClassOffsets,
        inlayHints,
        hasSlot: false,
        bindingAttrLocs,
        inheritedAttrVars,
        templateRefs,
        currentComponent: undefined,
        singleRootElType: undefined,
        singleRootNode: undefined,
        accessExternalVariable(name, offset) {
            let arr = accessExternalVariables.get(name);
            if (!arr) {
                accessExternalVariables.set(name, arr = new Set());
            }
            if (offset !== undefined) {
                arr.add(offset);
            }
        },
        hasLocalVariable: (name) => {
            return !!localVars.get(name);
        },
        addLocalVariable: (name) => {
            localVars.set(name, (localVars.get(name) ?? 0) + 1);
        },
        removeLocalVariable: (name) => {
            localVars.set(name, localVars.get(name) - 1);
        },
        getInternalVariable: () => {
            return `__VLS_${variableId++}`;
        },
        ignoreError: function* () {
            if (!ignoredError) {
                ignoredError = true;
                yield `// @vue-ignore start${utils_1.newLine}`;
            }
        },
        expectError: function* (prevNode) {
            if (!expectErrorToken) {
                expectErrorToken = {
                    errors: 0,
                    node: prevNode,
                };
                yield `// @vue-expect-error start${utils_1.newLine}`;
            }
        },
        resetDirectiveComments: function* (endStr) {
            if (expectErrorToken) {
                const token = expectErrorToken;
                yield* (0, utils_1.wrapWith)(expectErrorToken.node.loc.start.offset, expectErrorToken.node.loc.end.offset, {
                    verification: {
                        shouldReport: () => token.errors === 0,
                    },
                }, `// @ts-expect-error __VLS_TS_EXPECT_ERROR`);
                yield `${utils_1.newLine}${utils_1.endOfLine}`;
                expectErrorToken = undefined;
                yield `// @vue-expect-error ${endStr}${utils_1.newLine}`;
            }
            if (ignoredError) {
                ignoredError = false;
                yield `// @vue-ignore ${endStr}${utils_1.newLine}`;
            }
        },
        generateAutoImportCompletion: function* () {
            if (!options.edited) {
                return;
            }
            const all = [...accessExternalVariables.entries()];
            if (!all.some(([_, offsets]) => offsets.size)) {
                return;
            }
            yield `// @ts-ignore${utils_1.newLine}`; // #2304
            yield `[`;
            for (const [varName, offsets] of all) {
                for (const offset of offsets) {
                    if (options.scriptSetupBindingNames.has(varName)) {
                        // #3409
                        yield [
                            varName,
                            'template',
                            offset,
                            {
                                ...codeFeatures.additionalCompletion,
                                ...codeFeatures.withoutHighlightAndCompletionAndNavigation,
                            },
                        ];
                    }
                    else {
                        yield [
                            varName,
                            'template',
                            offset,
                            codeFeatures.additionalCompletion,
                        ];
                    }
                    yield `,`;
                }
                offsets.clear();
            }
            yield `]${utils_1.endOfLine}`;
        }
    };
}
//# sourceMappingURL=context.js.map