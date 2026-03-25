"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OasVersion = void 0;
exports.bundleConfig = bundleConfig;
exports.bundle = bundle;
exports.bundleFromString = bundleFromString;
exports.bundleDocument = bundleDocument;
exports.mapTypeToComponent = mapTypeToComponent;
const resolve_1 = require("./resolve");
const visitors_1 = require("./visitors");
const types_1 = require("./types");
const walk_1 = require("./walk");
const oas_types_1 = require("./oas-types");
const ref_utils_1 = require("./ref-utils");
const rules_1 = require("./config/rules");
const no_unresolved_refs_1 = require("./rules/no-unresolved-refs");
const utils_1 = require("./utils");
const domains_1 = require("./redocly/domains");
const remove_unused_components_1 = require("./decorators/oas2/remove-unused-components");
const remove_unused_components_2 = require("./decorators/oas3/remove-unused-components");
const redocly_yaml_1 = require("./types/redocly-yaml");
var OasVersion;
(function (OasVersion) {
    OasVersion["Version2"] = "oas2";
    OasVersion["Version3_0"] = "oas3_0";
    OasVersion["Version3_1"] = "oas3_1";
})(OasVersion || (exports.OasVersion = OasVersion = {}));
async function bundleConfig(document, resolvedRefMap) {
    const types = (0, types_1.normalizeTypes)(redocly_yaml_1.ConfigTypes);
    const ctx = {
        problems: [],
        oasVersion: oas_types_1.SpecVersion.OAS3_0,
        refTypes: new Map(),
        visitorsData: {},
    };
    const bundleVisitor = (0, visitors_1.normalizeVisitors)([
        {
            severity: 'error',
            ruleId: 'configBundler',
            visitor: {
                ref: {
                    leave(node, ctx, resolved) {
                        replaceRef(node, resolved, ctx);
                    },
                },
            },
        },
    ], types);
    (0, walk_1.walkDocument)({
        document,
        rootType: types.ConfigRoot,
        normalizedVisitors: bundleVisitor,
        resolvedRefMap,
        ctx,
    });
    return document.parsed ?? {};
}
async function bundle(opts) {
    const { ref, doc, externalRefResolver = new resolve_1.BaseResolver(opts.config.resolve), base = null, } = opts;
    if (!(ref || doc)) {
        throw new Error('Document or reference is required.\n');
    }
    const document = doc === undefined ? await externalRefResolver.resolveDocument(base, ref, true) : doc;
    if (document instanceof Error) {
        throw document;
    }
    opts.collectSpecData?.(document.parsed);
    return bundleDocument({
        document,
        ...opts,
        config: opts.config.styleguide,
        externalRefResolver,
    });
}
async function bundleFromString(opts) {
    const { source, absoluteRef, externalRefResolver = new resolve_1.BaseResolver(opts.config.resolve) } = opts;
    const document = (0, resolve_1.makeDocumentFromString)(source, absoluteRef || '/');
    return bundleDocument({
        document,
        ...opts,
        externalRefResolver,
        config: opts.config.styleguide,
    });
}
async function bundleDocument(opts) {
    const { document, config, customTypes, externalRefResolver, dereference = false, skipRedoclyRegistryRefs = false, removeUnusedComponents = false, keepUrlRefs = false, } = opts;
    const specVersion = (0, oas_types_1.detectSpec)(document.parsed);
    const specMajorVersion = (0, oas_types_1.getMajorSpecVersion)(specVersion);
    const rules = config.getRulesForSpecVersion(specMajorVersion);
    const types = (0, types_1.normalizeTypes)(config.extendTypes(customTypes ?? (0, oas_types_1.getTypes)(specVersion), specVersion), config);
    const preprocessors = (0, rules_1.initRules)(rules, config, 'preprocessors', specVersion);
    const decorators = (0, rules_1.initRules)(rules, config, 'decorators', specVersion);
    const ctx = {
        problems: [],
        oasVersion: specVersion,
        refTypes: new Map(),
        visitorsData: {},
    };
    if (removeUnusedComponents) {
        decorators.push({
            severity: 'error',
            ruleId: 'remove-unused-components',
            visitor: specMajorVersion === oas_types_1.SpecMajorVersion.OAS2
                ? (0, remove_unused_components_1.RemoveUnusedComponents)({})
                : (0, remove_unused_components_2.RemoveUnusedComponents)({}),
        });
    }
    let resolvedRefMap = await (0, resolve_1.resolveDocument)({
        rootDocument: document,
        rootType: types.Root,
        externalRefResolver,
    });
    if (preprocessors.length > 0) {
        // Make additional pass to resolve refs defined in preprocessors.
        (0, walk_1.walkDocument)({
            document,
            rootType: types.Root,
            normalizedVisitors: (0, visitors_1.normalizeVisitors)(preprocessors, types),
            resolvedRefMap,
            ctx,
        });
        resolvedRefMap = await (0, resolve_1.resolveDocument)({
            rootDocument: document,
            rootType: types.Root,
            externalRefResolver,
        });
    }
    const bundleVisitor = (0, visitors_1.normalizeVisitors)([
        {
            severity: 'error',
            ruleId: 'bundler',
            visitor: makeBundleVisitor(specMajorVersion, dereference, skipRedoclyRegistryRefs, document, resolvedRefMap, keepUrlRefs),
        },
        ...decorators,
    ], types);
    (0, walk_1.walkDocument)({
        document,
        rootType: types.Root,
        normalizedVisitors: bundleVisitor,
        resolvedRefMap,
        ctx,
    });
    return {
        bundle: document,
        problems: ctx.problems.map((problem) => config.addProblemToIgnore(problem)),
        fileDependencies: externalRefResolver.getFiles(),
        rootType: types.Root,
        refTypes: ctx.refTypes,
        visitorsData: ctx.visitorsData,
    };
}
function mapTypeToComponent(typeName, version) {
    switch (version) {
        case oas_types_1.SpecMajorVersion.OAS3:
            switch (typeName) {
                case 'Schema':
                    return 'schemas';
                case 'Parameter':
                    return 'parameters';
                case 'Response':
                    return 'responses';
                case 'Example':
                    return 'examples';
                case 'RequestBody':
                    return 'requestBodies';
                case 'Header':
                    return 'headers';
                case 'SecuritySchema':
                    return 'securitySchemes';
                case 'Link':
                    return 'links';
                case 'Callback':
                    return 'callbacks';
                default:
                    return null;
            }
        case oas_types_1.SpecMajorVersion.OAS2:
            switch (typeName) {
                case 'Schema':
                    return 'definitions';
                case 'Parameter':
                    return 'parameters';
                case 'Response':
                    return 'responses';
                default:
                    return null;
            }
        case oas_types_1.SpecMajorVersion.Async2:
            switch (typeName) {
                case 'Schema':
                    return 'schemas';
                case 'Parameter':
                    return 'parameters';
                default:
                    return null;
            }
        case oas_types_1.SpecMajorVersion.Async3:
            switch (typeName) {
                case 'Schema':
                    return 'schemas';
                case 'Parameter':
                    return 'parameters';
                default:
                    return null;
            }
        case oas_types_1.SpecMajorVersion.Arazzo1:
            switch (typeName) {
                case 'Root.workflows_items.parameters_items':
                case 'Root.workflows_items.steps_items.parameters_items':
                    return 'parameters';
                default:
                    return null;
            }
    }
}
function replaceRef(ref, resolved, ctx) {
    if (!(0, utils_1.isPlainObject)(resolved.node)) {
        ctx.parent[ctx.key] = resolved.node;
    }
    else {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete ref.$ref;
        const obj = Object.assign({}, resolved.node, ref);
        Object.assign(ref, obj); // assign ref itself again so ref fields take precedence
    }
}
// function oas3Move
function makeBundleVisitor(version, dereference, skipRedoclyRegistryRefs, rootDocument, resolvedRefMap, keepUrlRefs) {
    let components;
    let rootLocation;
    const visitor = {
        ref: {
            leave(node, ctx, resolved) {
                if (!resolved.location || resolved.node === undefined) {
                    (0, no_unresolved_refs_1.reportUnresolvedRef)(resolved, ctx.report, ctx.location);
                    return;
                }
                if (resolved.location.source === rootDocument.source &&
                    resolved.location.source === ctx.location.source &&
                    ctx.type.name !== 'scalar' &&
                    !dereference) {
                    return;
                }
                // do not bundle registry URL before push, otherwise we can't record dependencies
                if (skipRedoclyRegistryRefs && (0, domains_1.isRedoclyRegistryURL)(node.$ref)) {
                    return;
                }
                if (keepUrlRefs && (0, ref_utils_1.isAbsoluteUrl)(node.$ref)) {
                    return;
                }
                const componentType = mapTypeToComponent(ctx.type.name, version);
                if (!componentType) {
                    replaceRef(node, resolved, ctx);
                }
                else {
                    if (dereference) {
                        saveComponent(componentType, resolved, ctx);
                        replaceRef(node, resolved, ctx);
                    }
                    else {
                        node.$ref = saveComponent(componentType, resolved, ctx);
                        resolveBundledComponent(node, resolved, ctx);
                    }
                }
            },
        },
        Example: {
            leave(node, ctx) {
                if ((0, ref_utils_1.isExternalValue)(node) && node.value === undefined) {
                    const resolved = ctx.resolve({ $ref: node.externalValue });
                    if (!resolved.location || resolved.node === undefined) {
                        (0, no_unresolved_refs_1.reportUnresolvedRef)(resolved, ctx.report, ctx.location);
                        return;
                    }
                    if (keepUrlRefs && (0, ref_utils_1.isAbsoluteUrl)(node.externalValue)) {
                        return;
                    }
                    node.value = ctx.resolve({ $ref: node.externalValue }).node;
                    delete node.externalValue;
                }
            },
        },
        Root: {
            enter(root, ctx) {
                rootLocation = ctx.location;
                if (version === oas_types_1.SpecMajorVersion.OAS3) {
                    components = root.components = root.components || {};
                }
                else if (version === oas_types_1.SpecMajorVersion.OAS2) {
                    components = root;
                }
                else if (version === oas_types_1.SpecMajorVersion.Async2) {
                    components = root.components = root.components || {};
                }
                else if (version === oas_types_1.SpecMajorVersion.Async3) {
                    components = root.components = root.components || {};
                }
                else if (version === oas_types_1.SpecMajorVersion.Arazzo1) {
                    components = root.components = root.components || {};
                }
            },
        },
    };
    if (version === oas_types_1.SpecMajorVersion.OAS3) {
        visitor.DiscriminatorMapping = {
            leave(mapping, ctx) {
                for (const name of Object.keys(mapping)) {
                    const $ref = mapping[name];
                    const resolved = ctx.resolve({ $ref });
                    if (!resolved.location || resolved.node === undefined) {
                        (0, no_unresolved_refs_1.reportUnresolvedRef)(resolved, ctx.report, ctx.location.child(name));
                        return;
                    }
                    const componentType = mapTypeToComponent('Schema', version);
                    mapping[name] = saveComponent(componentType, resolved, ctx);
                }
            },
        };
    }
    function resolveBundledComponent(node, resolved, ctx) {
        const newRefId = (0, resolve_1.makeRefId)(ctx.location.source.absoluteRef, node.$ref);
        resolvedRefMap.set(newRefId, {
            document: rootDocument,
            isRemote: false,
            node: resolved.node,
            nodePointer: node.$ref,
            resolved: true,
        });
    }
    function saveComponent(componentType, target, ctx) {
        components[componentType] = components[componentType] || {};
        const name = getComponentName(target, componentType, ctx);
        components[componentType][name] = target.node;
        if (version === oas_types_1.SpecMajorVersion.OAS3 ||
            version === oas_types_1.SpecMajorVersion.Async2 ||
            version === oas_types_1.SpecMajorVersion.Async3) {
            return `#/components/${componentType}/${name}`;
        }
        else {
            return `#/${componentType}/${name}`;
        }
    }
    function isEqualOrEqualRef(node, target, ctx) {
        if ((0, ref_utils_1.isRef)(node) &&
            ctx.resolve(node, rootLocation.absolutePointer).location?.absolutePointer ===
                target.location.absolutePointer) {
            return true;
        }
        return (0, utils_1.dequal)(node, target.node);
    }
    function getComponentName(target, componentType, ctx) {
        const [fileRef, pointer] = [target.location.source.absoluteRef, target.location.pointer];
        const componentsGroup = components[componentType];
        let name = '';
        const refParts = pointer.slice(2).split('/').filter(utils_1.isTruthy); // slice(2) removes "#/"
        while (refParts.length > 0) {
            name = refParts.pop() + (name ? `-${name}` : '');
            if (!componentsGroup ||
                !componentsGroup[name] ||
                isEqualOrEqualRef(componentsGroup[name], target, ctx)) {
                return name;
            }
        }
        name = (0, ref_utils_1.refBaseName)(fileRef) + (name ? `_${name}` : '');
        if (!componentsGroup[name] || isEqualOrEqualRef(componentsGroup[name], target, ctx)) {
            return name;
        }
        const prevName = name;
        let serialId = 2;
        while (componentsGroup[name] && !isEqualOrEqualRef(componentsGroup[name], target, ctx)) {
            name = `${prevName}-${serialId}`;
            serialId++;
        }
        if (!componentsGroup[name]) {
            ctx.report({
                message: `Two schemas are referenced with the same name but different content. Renamed ${prevName} to ${name}.`,
                location: ctx.location,
                forceSeverity: 'warn',
            });
        }
        return name;
    }
    return visitor;
}
