"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSplit = handleSplit;
exports.startsWithComponents = startsWithComponents;
exports.crawl = crawl;
exports.iteratePathItems = iteratePathItems;
const colorette_1 = require("colorette");
const fs = require("fs");
const openapi_core_1 = require("@redocly/openapi-core");
const utils_1 = require("@redocly/openapi-core/lib/utils");
const path = require("path");
const perf_hooks_1 = require("perf_hooks");
const miscellaneous_1 = require("../../utils/miscellaneous");
const js_utils_1 = require("../../utils/js-utils");
const types_1 = require("./types");
async function handleSplit({ argv, collectSpecData }) {
    const startedAt = perf_hooks_1.performance.now();
    const { api, outDir, separator } = argv;
    validateDefinitionFileName(api);
    const ext = (0, miscellaneous_1.getAndValidateFileExtension)(api);
    const openapi = (0, miscellaneous_1.readYaml)(api);
    collectSpecData?.(openapi);
    splitDefinition(openapi, outDir, separator, ext);
    process.stderr.write(`🪓 Document: ${(0, colorette_1.blue)(api)} ${(0, colorette_1.green)('is successfully split')}
    and all related files are saved to the directory: ${(0, colorette_1.blue)(outDir)} \n`);
    (0, miscellaneous_1.printExecutionTime)('split', startedAt, api);
}
function splitDefinition(openapi, openapiDir, pathSeparator, ext) {
    fs.mkdirSync(openapiDir, { recursive: true });
    const componentsFiles = {};
    iterateComponents(openapi, openapiDir, componentsFiles, ext);
    iteratePathItems(openapi.paths, openapiDir, path.join(openapiDir, 'paths'), componentsFiles, pathSeparator, undefined, ext);
    const webhooks = openapi.webhooks || openapi['x-webhooks'];
    // use webhook_ prefix for code samples to prevent potential name-clashes with paths samples
    iteratePathItems(webhooks, openapiDir, path.join(openapiDir, 'webhooks'), componentsFiles, pathSeparator, 'webhook_', ext);
    replace$Refs(openapi, openapiDir, componentsFiles);
    (0, miscellaneous_1.writeToFileByExtension)(openapi, path.join(openapiDir, `openapi.${ext}`));
}
function startsWithComponents(node) {
    return node.startsWith(`#/${types_1.COMPONENTS}/`);
}
function isSupportedExtension(filename) {
    return filename.endsWith('.yaml') || filename.endsWith('.yml') || filename.endsWith('.json');
}
function loadFile(fileName) {
    try {
        return (0, openapi_core_1.parseYaml)(fs.readFileSync(fileName, 'utf8'));
    }
    catch (e) {
        return (0, miscellaneous_1.exitWithError)(e.message);
    }
}
function validateDefinitionFileName(fileName) {
    if (!fs.existsSync(fileName))
        (0, miscellaneous_1.exitWithError)(`File ${(0, colorette_1.blue)(fileName)} does not exist.`);
    const file = loadFile(fileName);
    if (file.swagger)
        (0, miscellaneous_1.exitWithError)('OpenAPI 2 is not supported by this command.');
    if (!file.openapi)
        (0, miscellaneous_1.exitWithError)('File does not conform to the OpenAPI Specification. OpenAPI version is not specified.');
    return true;
}
function traverseDirectoryDeep(directory, callback, componentsFiles) {
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory())
        return;
    const files = fs.readdirSync(directory);
    for (const f of files) {
        const filename = path.join(directory, f);
        if (fs.statSync(filename).isDirectory()) {
            traverseDirectoryDeep(filename, callback, componentsFiles);
        }
        else {
            callback(filename, directory, componentsFiles);
        }
    }
}
function traverseDirectoryDeepCallback(filename, directory, componentsFiles) {
    if (!isSupportedExtension(filename))
        return;
    const pathData = (0, miscellaneous_1.readYaml)(filename);
    replace$Refs(pathData, directory, componentsFiles);
    (0, miscellaneous_1.writeToFileByExtension)(pathData, filename);
}
function crawl(object, visitor) {
    if (!(0, js_utils_1.isObject)(object))
        return;
    visitor(object);
    for (const key of Object.keys(object)) {
        crawl(object[key], visitor);
    }
}
function replace$Refs(obj, relativeFrom, componentFiles = {}) {
    crawl(obj, (node) => {
        if (node.$ref && typeof node.$ref === 'string' && startsWithComponents(node.$ref)) {
            replace(node, '$ref');
        }
        else if ((0, js_utils_1.isObject)(node.discriminator) && (0, js_utils_1.isObject)(node.discriminator.mapping)) {
            const { mapping } = node.discriminator;
            for (const name of Object.keys(mapping)) {
                const mappingPointer = mapping[name];
                if (typeof mappingPointer === 'string' && startsWithComponents(mappingPointer)) {
                    replace(node.discriminator.mapping, name);
                }
            }
        }
    });
    function replace(node, key) {
        const splittedNode = node[key].split('/');
        const name = splittedNode.pop();
        const groupName = splittedNode[2];
        const filesGroupName = componentFiles[groupName];
        if (!filesGroupName || !filesGroupName[name])
            return;
        let filename = path.relative(relativeFrom, filesGroupName[name].filename);
        if (!filename.startsWith('.')) {
            filename = '.' + path.sep + filename;
        }
        node[key] = filename;
    }
}
function implicitlyReferenceDiscriminator(obj, defName, filename, schemaFiles) {
    if (!obj.discriminator)
        return;
    const defPtr = `#/${types_1.COMPONENTS}/${types_1.OPENAPI3_COMPONENT.Schemas}/${defName}`;
    const implicitMapping = {};
    for (const [name, { inherits, filename: parentFilename }] of Object.entries(schemaFiles)) {
        if (inherits.indexOf(defPtr) > -1) {
            const res = path.relative(path.dirname(filename), parentFilename);
            implicitMapping[name] = res.startsWith('.') ? res : '.' + path.sep + res;
        }
    }
    if ((0, js_utils_1.isEmptyObject)(implicitMapping))
        return;
    const discriminatorPropSchema = obj.properties[obj.discriminator.propertyName];
    const discriminatorEnum = discriminatorPropSchema && discriminatorPropSchema.enum;
    const mapping = (obj.discriminator.mapping = obj.discriminator.mapping || {});
    for (const name of Object.keys(implicitMapping)) {
        if (discriminatorEnum && !discriminatorEnum.includes(name)) {
            continue;
        }
        if (mapping[name] && mapping[name] !== implicitMapping[name]) {
            process.stderr.write((0, colorette_1.yellow)(`warning: explicit mapping overlaps with local mapping entry ${(0, colorette_1.red)(name)} at ${(0, colorette_1.blue)(filename)}. Please check it.`));
        }
        mapping[name] = implicitMapping[name];
    }
}
function isNotSecurityComponentType(componentType) {
    return componentType !== types_1.OPENAPI3_COMPONENT.SecuritySchemes;
}
function findComponentTypes(components) {
    return types_1.OPENAPI3_COMPONENT_NAMES.filter((item) => isNotSecurityComponentType(item) && Object.keys(components).includes(item));
}
function doesFileDiffer(filename, componentData) {
    return fs.existsSync(filename) && !(0, utils_1.dequal)((0, miscellaneous_1.readYaml)(filename), componentData);
}
function removeEmptyComponents(openapi, componentType) {
    if (openapi.components && (0, js_utils_1.isEmptyObject)(openapi.components[componentType])) {
        delete openapi.components[componentType];
    }
    if ((0, js_utils_1.isEmptyObject)(openapi.components)) {
        delete openapi.components;
    }
}
function createComponentDir(componentDirPath, componentType) {
    if (isNotSecurityComponentType(componentType)) {
        fs.mkdirSync(componentDirPath, { recursive: true });
    }
}
function extractFileNameFromPath(filename) {
    return path.basename(filename, path.extname(filename));
}
function getFileNamePath(componentDirPath, componentName, ext) {
    return path.join(componentDirPath, componentName) + `.${ext}`;
}
function gatherComponentsFiles(components, componentsFiles, componentType, componentName, filename) {
    let inherits = [];
    if (componentType === types_1.OPENAPI3_COMPONENT.Schemas) {
        inherits = (components?.[componentType]?.[componentName]?.allOf || [])
            .map(({ $ref }) => $ref)
            .filter(openapi_core_1.isTruthy);
    }
    componentsFiles[componentType] = componentsFiles[componentType] || {};
    componentsFiles[componentType][componentName] = { inherits, filename };
}
function iteratePathItems(pathItems, openapiDir, outDir, componentsFiles, pathSeparator, codeSamplesPathPrefix = '', ext) {
    if (!pathItems)
        return;
    fs.mkdirSync(outDir, { recursive: true });
    for (const pathName of Object.keys(pathItems)) {
        const pathFile = `${path.join(outDir, (0, miscellaneous_1.pathToFilename)(pathName, pathSeparator))}.${ext}`;
        const pathData = pathItems[pathName];
        if ((0, openapi_core_1.isRef)(pathData))
            continue;
        for (const method of types_1.OPENAPI3_METHOD_NAMES) {
            const methodData = pathData[method];
            const methodDataXCode = methodData?.['x-code-samples'] || methodData?.['x-codeSamples'];
            if (!methodDataXCode || !Array.isArray(methodDataXCode)) {
                continue;
            }
            for (const sample of methodDataXCode) {
                if (sample.source && sample.source.$ref)
                    continue;
                const sampleFileName = path.join(openapiDir, 'code_samples', (0, miscellaneous_1.escapeLanguageName)(sample.lang), codeSamplesPathPrefix + (0, miscellaneous_1.pathToFilename)(pathName, pathSeparator), method + (0, miscellaneous_1.langToExt)(sample.lang));
                fs.mkdirSync(path.dirname(sampleFileName), { recursive: true });
                fs.writeFileSync(sampleFileName, sample.source);
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                sample.source = {
                    $ref: (0, openapi_core_1.slash)(path.relative(outDir, sampleFileName)),
                };
            }
        }
        (0, miscellaneous_1.writeToFileByExtension)(pathData, pathFile);
        pathItems[pathName] = {
            $ref: (0, openapi_core_1.slash)(path.relative(openapiDir, pathFile)),
        };
        traverseDirectoryDeep(outDir, traverseDirectoryDeepCallback, componentsFiles);
    }
}
function iterateComponents(openapi, openapiDir, componentsFiles, ext) {
    const { components } = openapi;
    if (components) {
        const componentsDir = path.join(openapiDir, types_1.COMPONENTS);
        fs.mkdirSync(componentsDir, { recursive: true });
        const componentTypes = findComponentTypes(components);
        componentTypes.forEach(iterateAndGatherComponentsFiles);
        componentTypes.forEach(iterateComponentTypes);
        // eslint-disable-next-line no-inner-declarations
        function iterateAndGatherComponentsFiles(componentType) {
            const componentDirPath = path.join(componentsDir, componentType);
            for (const componentName of Object.keys(components?.[componentType] || {})) {
                const filename = getFileNamePath(componentDirPath, componentName, ext);
                gatherComponentsFiles(components, componentsFiles, componentType, componentName, filename);
            }
        }
        // eslint-disable-next-line no-inner-declarations
        function iterateComponentTypes(componentType) {
            const componentDirPath = path.join(componentsDir, componentType);
            createComponentDir(componentDirPath, componentType);
            for (const componentName of Object.keys(components?.[componentType] || {})) {
                const filename = getFileNamePath(componentDirPath, componentName, ext);
                const componentData = components?.[componentType]?.[componentName];
                replace$Refs(componentData, path.dirname(filename), componentsFiles);
                implicitlyReferenceDiscriminator(componentData, extractFileNameFromPath(filename), filename, componentsFiles.schemas || {});
                if (doesFileDiffer(filename, componentData)) {
                    process.stderr.write((0, colorette_1.yellow)(`warning: conflict for ${componentName} - file already exists with different content: ${(0, colorette_1.blue)(filename)} ... Skip.\n`));
                }
                else {
                    (0, miscellaneous_1.writeToFileByExtension)(componentData, filename);
                }
                if (isNotSecurityComponentType(componentType)) {
                    // security schemas must referenced from components
                    delete openapi.components?.[componentType]?.[componentName];
                }
            }
            removeEmptyComponents(openapi, componentType);
        }
    }
}
