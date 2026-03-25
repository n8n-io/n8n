"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleJoin = handleJoin;
const path = require("path");
const colorette_1 = require("colorette");
const perf_hooks_1 = require("perf_hooks");
const openapi_core_1 = require("@redocly/openapi-core");
const utils_1 = require("@redocly/openapi-core/lib/utils");
const miscellaneous_1 = require("../utils/miscellaneous");
const js_utils_1 = require("../utils/js-utils");
const types_1 = require("./split/types");
const split_1 = require("./split");
const Tags = 'tags';
const xTagGroups = 'x-tagGroups';
let potentialConflictsTotal = 0;
async function handleJoin({ argv, config, version: packageVersion, }) {
    const startedAt = perf_hooks_1.performance.now();
    const { 'prefix-components-with-info-prop': prefixComponentsWithInfoProp, 'prefix-tags-with-filename': prefixTagsWithFilename, 'prefix-tags-with-info-prop': prefixTagsWithInfoProp, 'without-x-tag-groups': withoutXTagGroups, output, } = argv;
    const usedTagsOptions = [
        prefixTagsWithFilename && 'prefix-tags-with-filename',
        prefixTagsWithInfoProp && 'prefix-tags-with-info-prop',
        withoutXTagGroups && 'without-x-tag-groups',
    ].filter(Boolean);
    if (usedTagsOptions.length > 1) {
        return (0, miscellaneous_1.exitWithError)(`You use ${(0, colorette_1.yellow)(usedTagsOptions.join(', '))} together.\nPlease choose only one!`);
    }
    const apis = await (0, miscellaneous_1.getFallbackApisOrExit)(argv.apis, config);
    if (apis.length < 2) {
        return (0, miscellaneous_1.exitWithError)(`At least 2 APIs should be provided.`);
    }
    const fileExtension = (0, miscellaneous_1.getAndValidateFileExtension)(output || apis[0].path);
    const specFilename = output || `openapi.${fileExtension}`;
    const externalRefResolver = new openapi_core_1.BaseResolver(config.resolve);
    const documents = await Promise.all(apis.map(({ path }) => externalRefResolver.resolveDocument(null, path, true)));
    const decorators = new Set([
        ...Object.keys(config.styleguide.decorators.oas3_0),
        ...Object.keys(config.styleguide.decorators.oas3_1),
        ...Object.keys(config.styleguide.decorators.oas2),
    ]);
    config.styleguide.skipDecorators(Array.from(decorators));
    const preprocessors = new Set([
        ...Object.keys(config.styleguide.preprocessors.oas3_0),
        ...Object.keys(config.styleguide.preprocessors.oas3_1),
        ...Object.keys(config.styleguide.preprocessors.oas2),
    ]);
    config.styleguide.skipPreprocessors(Array.from(preprocessors));
    const bundleResults = await Promise.all(documents.map((document) => (0, openapi_core_1.bundleDocument)({
        document,
        config: config.styleguide,
        externalRefResolver: new openapi_core_1.BaseResolver(config.resolve),
    }).catch((e) => {
        (0, miscellaneous_1.exitWithError)(`${e.message}: ${(0, colorette_1.blue)(document.source.absoluteRef)}`);
    })));
    for (const { problems, bundle: document } of bundleResults) {
        const fileTotals = (0, openapi_core_1.getTotals)(problems);
        if (fileTotals.errors) {
            (0, openapi_core_1.formatProblems)(problems, {
                totals: fileTotals,
                version: packageVersion,
            });
            (0, miscellaneous_1.exitWithError)(`❌ Errors encountered while bundling ${(0, colorette_1.blue)(document.source.absoluteRef)}: join will not proceed.`);
        }
    }
    let oasVersion = null;
    for (const document of documents) {
        try {
            const version = (0, openapi_core_1.detectSpec)(document.parsed);
            if (version !== openapi_core_1.SpecVersion.OAS3_0 && version !== openapi_core_1.SpecVersion.OAS3_1) {
                return (0, miscellaneous_1.exitWithError)(`Only OpenAPI 3.0 and OpenAPI 3.1 are supported: ${(0, colorette_1.blue)(document.source.absoluteRef)}.`);
            }
            oasVersion = oasVersion ?? version;
            if (oasVersion !== version) {
                return (0, miscellaneous_1.exitWithError)(`All APIs must use the same OpenAPI version: ${(0, colorette_1.blue)(document.source.absoluteRef)}.`);
            }
        }
        catch (e) {
            return (0, miscellaneous_1.exitWithError)(`${e.message}: ${(0, colorette_1.blue)(document.source.absoluteRef)}.`);
        }
    }
    const joinedDef = {};
    const potentialConflicts = {
        tags: {},
        paths: {},
        components: {},
        webhooks: {},
    };
    addInfoSectionAndSpecVersion(documents, prefixComponentsWithInfoProp);
    for (const document of documents) {
        const openapi = document.parsed;
        const { tags, info } = openapi;
        const api = path.relative(process.cwd(), document.source.absoluteRef);
        const apiFilename = getApiFilename(api);
        const tagsPrefix = prefixTagsWithFilename
            ? apiFilename
            : getInfoPrefix(info, prefixTagsWithInfoProp, 'tags');
        const componentsPrefix = getInfoPrefix(info, prefixComponentsWithInfoProp, types_1.COMPONENTS);
        if (openapi.hasOwnProperty('x-tagGroups')) {
            process.stderr.write((0, colorette_1.yellow)(`warning: x-tagGroups at ${(0, colorette_1.blue)(api)} will be skipped \n`));
        }
        const context = {
            api,
            apiFilename,
            apiTitle: info?.title,
            tags,
            potentialConflicts,
            tagsPrefix,
            componentsPrefix,
        };
        if (tags) {
            populateTags(context);
        }
        collectServers(openapi);
        collectExternalDocs(openapi, context);
        collectPaths(openapi, context);
        collectComponents(openapi, context);
        collectWebhooks(oasVersion, openapi, context);
        if (componentsPrefix) {
            replace$Refs(openapi, componentsPrefix);
        }
    }
    iteratePotentialConflicts(potentialConflicts, withoutXTagGroups);
    const noRefs = true;
    if (potentialConflictsTotal) {
        return (0, miscellaneous_1.exitWithError)(`Please fix conflicts before running ${(0, colorette_1.yellow)('join')}.`);
    }
    (0, miscellaneous_1.writeToFileByExtension)((0, miscellaneous_1.sortTopLevelKeysForOas)(joinedDef), specFilename, noRefs);
    (0, miscellaneous_1.printExecutionTime)('join', startedAt, specFilename);
    function populateTags({ api, apiFilename, apiTitle, tags, potentialConflicts, tagsPrefix, componentsPrefix, }) {
        if (!joinedDef.hasOwnProperty(Tags)) {
            joinedDef[Tags] = [];
        }
        if (!potentialConflicts.tags.hasOwnProperty('all')) {
            potentialConflicts.tags['all'] = {};
        }
        if (withoutXTagGroups && !potentialConflicts.tags.hasOwnProperty('description')) {
            potentialConflicts.tags['description'] = {};
        }
        for (const tag of tags) {
            const entrypointTagName = addPrefix(tag.name, tagsPrefix);
            if (tag.description) {
                tag.description = addComponentsPrefix(tag.description, componentsPrefix);
            }
            const tagDuplicate = joinedDef.tags.find((t) => t.name === entrypointTagName);
            if (tagDuplicate && withoutXTagGroups) {
                // If tag already exist and `without-x-tag-groups` option,
                // check if description are different for potential conflicts warning.
                const isTagDescriptionNotEqual = tag.hasOwnProperty('description') && tagDuplicate.description !== tag.description;
                potentialConflicts.tags.description[entrypointTagName].push(...(isTagDescriptionNotEqual ? [api] : []));
            }
            else if (!tagDuplicate) {
                // Instead add tag to joinedDef if there no duplicate;
                tag['x-displayName'] = tag['x-displayName'] || tag.name;
                tag.name = entrypointTagName;
                joinedDef.tags.push(tag);
                if (withoutXTagGroups) {
                    potentialConflicts.tags.description[entrypointTagName] = [api];
                }
            }
            if (!withoutXTagGroups) {
                const groupName = apiTitle || apiFilename;
                createXTagGroups(groupName);
                if (!tagDuplicate) {
                    populateXTagGroups(entrypointTagName, getIndexGroup(groupName));
                }
            }
            const doesEntrypointExist = !potentialConflicts.tags.all[entrypointTagName] ||
                (potentialConflicts.tags.all[entrypointTagName] &&
                    !potentialConflicts.tags.all[entrypointTagName].includes(api));
            potentialConflicts.tags.all[entrypointTagName] = [
                ...(potentialConflicts.tags.all[entrypointTagName] || []),
                ...(!withoutXTagGroups && doesEntrypointExist ? [api] : []),
            ];
        }
    }
    function getIndexGroup(name) {
        return joinedDef[xTagGroups].findIndex((item) => item.name === name);
    }
    function createXTagGroups(name) {
        if (!joinedDef.hasOwnProperty(xTagGroups)) {
            joinedDef[xTagGroups] = [];
        }
        if (!joinedDef[xTagGroups].some((g) => g.name === name)) {
            joinedDef[xTagGroups].push({ name, tags: [] });
        }
        const indexGroup = getIndexGroup(name);
        if (!joinedDef[xTagGroups][indexGroup].hasOwnProperty(Tags)) {
            joinedDef[xTagGroups][indexGroup][Tags] = [];
        }
    }
    function populateXTagGroups(entrypointTagName, indexGroup) {
        if (!joinedDef[xTagGroups][indexGroup][Tags].find((t) => t.name === entrypointTagName)) {
            joinedDef[xTagGroups][indexGroup][Tags].push(entrypointTagName);
        }
    }
    function collectServers(openapi) {
        const { servers } = openapi;
        if (servers) {
            if (!joinedDef.hasOwnProperty('servers')) {
                joinedDef['servers'] = [];
            }
            for (const server of servers) {
                if (!joinedDef.servers.some((s) => s.url === server.url)) {
                    joinedDef.servers.push(server);
                }
            }
        }
    }
    function collectExternalDocs(openapi, { api }) {
        const { externalDocs } = openapi;
        if (externalDocs) {
            if (joinedDef.hasOwnProperty('externalDocs')) {
                process.stderr.write((0, colorette_1.yellow)(`warning: skip externalDocs from ${(0, colorette_1.blue)(path.basename(api))} \n`));
                return;
            }
            joinedDef['externalDocs'] = externalDocs;
        }
    }
    function collectPaths(openapi, { apiFilename, apiTitle, api, potentialConflicts, tagsPrefix, componentsPrefix, }) {
        const { paths } = openapi;
        const operationsSet = new Set((0, js_utils_1.keysOf)(types_1.OPENAPI3_METHOD));
        if (paths) {
            if (!joinedDef.hasOwnProperty('paths')) {
                joinedDef['paths'] = {};
            }
            for (const path of (0, js_utils_1.keysOf)(paths)) {
                if (!joinedDef.paths.hasOwnProperty(path)) {
                    joinedDef.paths[path] = {};
                }
                if (!potentialConflicts.paths.hasOwnProperty(path)) {
                    potentialConflicts.paths[path] = {};
                }
                const pathItem = paths[path];
                for (const field of (0, js_utils_1.keysOf)(pathItem)) {
                    if (operationsSet.has(field)) {
                        collectPathOperation(pathItem, path, field);
                    }
                    if (field === 'servers') {
                        collectPathServers(pathItem, path);
                    }
                    if (field === 'parameters') {
                        collectPathParameters(pathItem, path);
                    }
                    if (typeof pathItem[field] === 'string') {
                        collectPathStringFields(pathItem, path, field);
                    }
                }
            }
        }
        function collectPathStringFields(pathItem, path, field) {
            const fieldValue = pathItem[field];
            if (joinedDef.paths[path].hasOwnProperty(field) &&
                joinedDef.paths[path][field] !== fieldValue) {
                process.stderr.write((0, colorette_1.yellow)(`warning: different ${field} values in ${path}\n`));
                return;
            }
            joinedDef.paths[path][field] = fieldValue;
        }
        function collectPathServers(pathItem, path) {
            if (!pathItem.servers) {
                return;
            }
            if (!joinedDef.paths[path].hasOwnProperty('servers')) {
                joinedDef.paths[path].servers = [];
            }
            for (const server of pathItem.servers) {
                let isFoundServer = false;
                for (const pathServer of joinedDef.paths[path].servers) {
                    if (pathServer.url === server.url) {
                        if (!isServersEqual(pathServer, server)) {
                            (0, miscellaneous_1.exitWithError)(`Different server values for (${server.url}) in ${path}.`);
                        }
                        isFoundServer = true;
                    }
                }
                if (!isFoundServer) {
                    joinedDef.paths[path].servers.push(server);
                }
            }
        }
        function collectPathParameters(pathItem, path) {
            if (!pathItem.parameters) {
                return;
            }
            if (!joinedDef.paths[path].hasOwnProperty('parameters')) {
                joinedDef.paths[path].parameters = [];
            }
            for (const parameter of pathItem.parameters) {
                let isFoundParameter = false;
                for (const pathParameter of joinedDef.paths[path]
                    .parameters) {
                    // Compare $ref only if both are reference objects
                    if ((0, openapi_core_1.isRef)(pathParameter) && (0, openapi_core_1.isRef)(parameter)) {
                        if (pathParameter['$ref'] === parameter['$ref']) {
                            isFoundParameter = true;
                        }
                    }
                    // Compare properties only if both are reference objects
                    if (!(0, openapi_core_1.isRef)(pathParameter) && !(0, openapi_core_1.isRef)(parameter)) {
                        if (pathParameter.name === parameter.name && pathParameter.in === parameter.in) {
                            if (!(0, utils_1.dequal)(pathParameter.schema, parameter.schema)) {
                                (0, miscellaneous_1.exitWithError)(`Different parameter schemas for (${parameter.name}) in ${path}.`);
                            }
                            isFoundParameter = true;
                        }
                    }
                }
                if (!isFoundParameter) {
                    joinedDef.paths[path].parameters.push(parameter);
                }
            }
        }
        function collectPathOperation(pathItem, path, operation) {
            const pathOperation = pathItem[operation];
            if (!pathOperation) {
                return;
            }
            joinedDef.paths[path][operation] = pathOperation;
            potentialConflicts.paths[path][operation] = [
                ...(potentialConflicts.paths[path][operation] || []),
                api,
            ];
            const { operationId } = pathOperation;
            if (operationId) {
                if (!potentialConflicts.paths.hasOwnProperty('operationIds')) {
                    potentialConflicts.paths['operationIds'] = {};
                }
                potentialConflicts.paths.operationIds[operationId] = [
                    ...(potentialConflicts.paths.operationIds[operationId] || []),
                    api,
                ];
            }
            const { tags, security } = joinedDef.paths[path][operation];
            if (tags) {
                joinedDef.paths[path][operation].tags = tags.map((tag) => addPrefix(tag, tagsPrefix));
                populateTags({
                    api,
                    apiFilename,
                    apiTitle,
                    tags: formatTags(tags),
                    potentialConflicts,
                    tagsPrefix,
                    componentsPrefix,
                });
            }
            else {
                joinedDef.paths[path][operation]['tags'] = [addPrefix('other', tagsPrefix || apiFilename)];
                populateTags({
                    api,
                    apiFilename,
                    apiTitle,
                    tags: formatTags(['other']),
                    potentialConflicts,
                    tagsPrefix: tagsPrefix || apiFilename,
                    componentsPrefix,
                });
            }
            if (!security && openapi.hasOwnProperty('security')) {
                joinedDef.paths[path][operation]['security'] = addSecurityPrefix(openapi.security, componentsPrefix);
            }
            else if (pathOperation.security) {
                joinedDef.paths[path][operation].security = addSecurityPrefix(pathOperation.security, componentsPrefix);
            }
        }
    }
    function isServersEqual(serverOne, serverTwo) {
        if (serverOne.description === serverTwo.description) {
            return (0, utils_1.dequal)(serverOne.variables, serverTwo.variables);
        }
        return false;
    }
    function collectComponents(openapi, { api, potentialConflicts, componentsPrefix }) {
        const { components } = openapi;
        if (components) {
            if (!joinedDef.hasOwnProperty(types_1.COMPONENTS)) {
                joinedDef[types_1.COMPONENTS] = {};
            }
            for (const [component, componentObj] of Object.entries(components)) {
                if (!potentialConflicts[types_1.COMPONENTS].hasOwnProperty(component)) {
                    potentialConflicts[types_1.COMPONENTS][component] = {};
                    joinedDef[types_1.COMPONENTS][component] = {};
                }
                for (const item of Object.keys(componentObj)) {
                    const componentPrefix = addPrefix(item, componentsPrefix);
                    potentialConflicts.components[component][componentPrefix] = [
                        ...(potentialConflicts.components[component][item] || []),
                        { [api]: componentObj[item] },
                    ];
                    joinedDef.components[component][componentPrefix] = componentObj[item];
                }
            }
        }
    }
    function collectWebhooks(oasVersion, openapi, { apiFilename, apiTitle, api, potentialConflicts, tagsPrefix, componentsPrefix, }) {
        const webhooks = oasVersion === openapi_core_1.SpecVersion.OAS3_1 ? 'webhooks' : 'x-webhooks';
        const openapiWebhooks = openapi[webhooks];
        if (openapiWebhooks) {
            if (!joinedDef.hasOwnProperty(webhooks)) {
                joinedDef[webhooks] = {};
            }
            for (const webhook of Object.keys(openapiWebhooks)) {
                joinedDef[webhooks][webhook] = openapiWebhooks[webhook];
                if (!potentialConflicts.webhooks.hasOwnProperty(webhook)) {
                    potentialConflicts.webhooks[webhook] = {};
                }
                for (const operation of Object.keys(openapiWebhooks[webhook])) {
                    potentialConflicts.webhooks[webhook][operation] = [
                        ...(potentialConflicts.webhooks[webhook][operation] || []),
                        api,
                    ];
                }
                for (const operationKey of Object.keys(joinedDef[webhooks][webhook])) {
                    const { tags } = joinedDef[webhooks][webhook][operationKey];
                    if (tags) {
                        joinedDef[webhooks][webhook][operationKey].tags = tags.map((tag) => addPrefix(tag, tagsPrefix));
                        populateTags({
                            api,
                            apiFilename,
                            apiTitle,
                            tags: formatTags(tags),
                            potentialConflicts,
                            tagsPrefix,
                            componentsPrefix,
                        });
                    }
                }
            }
        }
    }
    function addInfoSectionAndSpecVersion(documents, prefixComponentsWithInfoProp) {
        const firstApi = documents[0];
        const openapi = firstApi.parsed;
        const componentsPrefix = getInfoPrefix(openapi.info, prefixComponentsWithInfoProp, types_1.COMPONENTS);
        if (!openapi.openapi)
            (0, miscellaneous_1.exitWithError)('Version of specification is not found.');
        if (!openapi.info)
            (0, miscellaneous_1.exitWithError)('Info section is not found in specification.');
        if (openapi.info?.description) {
            openapi.info.description = addComponentsPrefix(openapi.info.description, componentsPrefix);
        }
        joinedDef.openapi = openapi.openapi;
        joinedDef.info = openapi.info;
    }
}
function doesComponentsDiffer(curr, next) {
    return !(0, utils_1.dequal)(Object.values(curr)[0], Object.values(next)[0]);
}
function validateComponentsDifference(files) {
    let isDiffer = false;
    for (let i = 0, len = files.length; i < len; i++) {
        const next = files[i + 1];
        if (next && doesComponentsDiffer(files[i], next)) {
            isDiffer = true;
        }
    }
    return isDiffer;
}
function iteratePotentialConflicts(potentialConflicts, withoutXTagGroups) {
    for (const group of Object.keys(potentialConflicts)) {
        for (const [key, value] of Object.entries(potentialConflicts[group])) {
            const conflicts = filterConflicts(value);
            if (conflicts.length) {
                if (group === types_1.COMPONENTS) {
                    for (const [_, conflict] of Object.entries(conflicts)) {
                        if (validateComponentsDifference(conflict[1])) {
                            conflict[1] = conflict[1].map((c) => Object.keys(c)[0]);
                            showConflicts((0, colorette_1.green)(group) + ' => ' + key, [conflict]);
                            potentialConflictsTotal += 1;
                        }
                    }
                }
                else {
                    if (withoutXTagGroups && group === 'tags') {
                        duplicateTagDescriptionWarning(conflicts);
                    }
                    else {
                        potentialConflictsTotal += conflicts.length;
                        showConflicts((0, colorette_1.green)(group) + ' => ' + key, conflicts);
                    }
                }
                if (group === 'tags' && !withoutXTagGroups) {
                    prefixTagSuggestion(conflicts.length);
                }
            }
        }
    }
}
function duplicateTagDescriptionWarning(conflicts) {
    const tagsKeys = conflicts.map(([tagName]) => `\`${tagName}\``);
    const joinString = (0, colorette_1.yellow)(', ');
    process.stderr.write((0, colorette_1.yellow)(`\nwarning: ${tagsKeys.length} conflict(s) on the ${(0, colorette_1.red)(tagsKeys.join(joinString))} tags description.\n`));
}
function prefixTagSuggestion(conflictsLength) {
    process.stderr.write((0, colorette_1.green)(`\n${conflictsLength} conflict(s) on tags.\nSuggestion: please use ${(0, colorette_1.blue)('prefix-tags-with-filename')}, ${(0, colorette_1.blue)('prefix-tags-with-info-prop')} or ${(0, colorette_1.blue)('without-x-tag-groups')} to prevent naming conflicts.\n\n`));
}
function showConflicts(key, conflicts) {
    for (const [path, files] of conflicts) {
        process.stderr.write((0, colorette_1.yellow)(`Conflict on ${key} : ${(0, colorette_1.red)(path)} in files: ${(0, colorette_1.blue)(files)} \n`));
    }
}
function filterConflicts(entities) {
    return Object.entries(entities).filter(([_, files]) => files.length > 1);
}
function getApiFilename(filePath) {
    return path.basename(filePath, path.extname(filePath));
}
function addPrefix(tag, tagsPrefix) {
    return tagsPrefix ? tagsPrefix + '_' + tag : tag;
}
function formatTags(tags) {
    return tags.map((tag) => ({ name: tag }));
}
function addComponentsPrefix(description, componentsPrefix) {
    return description.replace(/"(#\/components\/.*?)"/g, (match) => {
        const componentName = path.basename(match);
        return match.replace(componentName, addPrefix(componentName, componentsPrefix));
    });
}
function addSecurityPrefix(security, componentsPrefix) {
    return componentsPrefix
        ? security?.map((s) => {
            const joinedSecuritySchema = {};
            for (const [key, value] of Object.entries(s)) {
                Object.assign(joinedSecuritySchema, { [componentsPrefix + '_' + key]: value });
            }
            return joinedSecuritySchema;
        })
        : security;
}
function getInfoPrefix(info, prefixArg, type) {
    if (!prefixArg)
        return '';
    if (!info)
        (0, miscellaneous_1.exitWithError)('Info section is not found in specification.');
    if (!info[prefixArg])
        (0, miscellaneous_1.exitWithError)(`${(0, colorette_1.yellow)(`prefix-${type}-with-info-prop`)} argument value is not found in info section.`);
    if (!(0, js_utils_1.isString)(info[prefixArg]))
        (0, miscellaneous_1.exitWithError)(`${(0, colorette_1.yellow)(`prefix-${type}-with-info-prop`)} argument value should be string.`);
    if (info[prefixArg].length > 50)
        (0, miscellaneous_1.exitWithError)(`${(0, colorette_1.yellow)(`prefix-${type}-with-info-prop`)} argument value length should not exceed 50 characters.`);
    return info[prefixArg].replaceAll(/\s/g, '_');
}
function replace$Refs(obj, componentsPrefix) {
    (0, split_1.crawl)(obj, (node) => {
        if (node.$ref && typeof node.$ref === 'string' && (0, split_1.startsWithComponents)(node.$ref)) {
            const name = path.basename(node.$ref);
            node.$ref = node.$ref.replace(name, componentsPrefix + '_' + name);
        }
        else if ((0, js_utils_1.isObject)(node.discriminator) && (0, js_utils_1.isObject)(node.discriminator.mapping)) {
            const { mapping } = node.discriminator;
            for (const name of Object.keys(mapping)) {
                const mappingPointer = mapping[name];
                if (typeof mappingPointer === 'string' && (0, split_1.startsWithComponents)(mappingPointer)) {
                    mapping[name] = mappingPointer
                        .split('/')
                        .map((name, i, arr) => {
                        return arr.length - 1 === i && !name.includes(componentsPrefix)
                            ? componentsPrefix + '_' + name
                            : name;
                    })
                        .join('/');
                }
            }
        }
    });
}
