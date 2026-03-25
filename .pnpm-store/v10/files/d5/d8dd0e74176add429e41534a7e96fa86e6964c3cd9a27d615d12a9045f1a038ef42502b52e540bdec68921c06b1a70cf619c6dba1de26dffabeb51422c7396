"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lint = lint;
exports.lintFromString = lintFromString;
exports.lintDocument = lintDocument;
exports.lintConfig = lintConfig;
const config_1 = require("@redocly/config");
const resolve_1 = require("./resolve");
const visitors_1 = require("./visitors");
const walk_1 = require("./walk");
const config_2 = require("./config");
const types_1 = require("./types");
const ajv_1 = require("./rules/ajv");
const oas_types_1 = require("./oas-types");
const redocly_yaml_1 = require("./types/redocly-yaml");
const struct_1 = require("./rules/common/struct");
const no_unresolved_refs_1 = require("./rules/no-unresolved-refs");
async function lint(opts) {
    const { ref, externalRefResolver = new resolve_1.BaseResolver(opts.config.resolve) } = opts;
    const document = (await externalRefResolver.resolveDocument(null, ref, true));
    opts.collectSpecData?.(document.parsed);
    return lintDocument({
        document,
        ...opts,
        externalRefResolver,
        config: opts.config.styleguide,
    });
}
async function lintFromString(opts) {
    const { source, absoluteRef, externalRefResolver = new resolve_1.BaseResolver(opts.config.resolve) } = opts;
    const document = (0, resolve_1.makeDocumentFromString)(source, absoluteRef || '/');
    return lintDocument({
        document,
        ...opts,
        externalRefResolver,
        config: opts.config.styleguide,
    });
}
async function lintDocument(opts) {
    (0, ajv_1.releaseAjvInstance)(); // FIXME: preprocessors can modify nodes which are then cached to ajv-instance by absolute path
    const { document, customTypes, externalRefResolver, config } = opts;
    const specVersion = (0, oas_types_1.detectSpec)(document.parsed);
    const specMajorVersion = (0, oas_types_1.getMajorSpecVersion)(specVersion);
    const rules = config.getRulesForSpecVersion(specMajorVersion);
    const types = (0, types_1.normalizeTypes)(config.extendTypes(customTypes ?? (0, oas_types_1.getTypes)(specVersion), specVersion), config);
    const ctx = {
        problems: [],
        oasVersion: specVersion,
        visitorsData: {},
    };
    const preprocessors = (0, config_2.initRules)(rules, config, 'preprocessors', specVersion);
    const regularRules = (0, config_2.initRules)(rules, config, 'rules', specVersion);
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
    const normalizedVisitors = (0, visitors_1.normalizeVisitors)(regularRules, types);
    (0, walk_1.walkDocument)({
        document,
        rootType: types.Root,
        normalizedVisitors,
        resolvedRefMap,
        ctx,
    });
    return ctx.problems.map((problem) => config.addProblemToIgnore(problem));
}
async function lintConfig(opts) {
    const { document, severity, externalRefResolver = new resolve_1.BaseResolver(), config } = opts;
    const ctx = {
        problems: [],
        oasVersion: oas_types_1.SpecVersion.OAS3_0,
        visitorsData: {},
    };
    const types = (0, types_1.normalizeTypes)(opts.externalConfigTypes || (0, redocly_yaml_1.createConfigTypes)(config_1.rootRedoclyConfigSchema, config), { doNotResolveExamples: config.styleguide.doNotResolveExamples });
    const rules = [
        {
            severity: severity || 'error',
            ruleId: 'configuration spec',
            visitor: (0, struct_1.Struct)({ severity: 'error' }),
        },
        {
            severity: severity || 'error',
            ruleId: 'configuration no-unresolved-refs',
            visitor: (0, no_unresolved_refs_1.NoUnresolvedRefs)({ severity: 'error' }),
        },
    ];
    const normalizedVisitors = (0, visitors_1.normalizeVisitors)(rules, types);
    const resolvedRefMap = opts.resolvedRefMap ||
        (await (0, resolve_1.resolveDocument)({
            rootDocument: document,
            rootType: types.ConfigRoot,
            externalRefResolver,
        }));
    (0, walk_1.walkDocument)({
        document,
        rootType: types.ConfigRoot,
        normalizedVisitors,
        resolvedRefMap,
        ctx,
    });
    return ctx.problems;
}
