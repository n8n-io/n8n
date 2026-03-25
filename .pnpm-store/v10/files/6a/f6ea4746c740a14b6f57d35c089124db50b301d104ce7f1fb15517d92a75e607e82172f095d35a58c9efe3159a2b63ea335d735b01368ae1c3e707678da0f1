"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandledError = exports.CircularJSONNotSupportedError = void 0;
exports.getFallbackApisOrExit = getFallbackApisOrExit;
exports.getExecutionTime = getExecutionTime;
exports.printExecutionTime = printExecutionTime;
exports.pathToFilename = pathToFilename;
exports.escapeLanguageName = escapeLanguageName;
exports.langToExt = langToExt;
exports.dumpBundle = dumpBundle;
exports.saveBundle = saveBundle;
exports.promptUser = promptUser;
exports.readYaml = readYaml;
exports.writeToFileByExtension = writeToFileByExtension;
exports.writeYaml = writeYaml;
exports.writeJson = writeJson;
exports.getAndValidateFileExtension = getAndValidateFileExtension;
exports.handleError = handleError;
exports.printLintTotals = printLintTotals;
exports.printConfigLintTotals = printConfigLintTotals;
exports.getOutputFileName = getOutputFileName;
exports.printUnusedWarnings = printUnusedWarnings;
exports.exitWithError = exitWithError;
exports.isSubdir = isSubdir;
exports.loadConfigAndHandleErrors = loadConfigAndHandleErrors;
exports.sortTopLevelKeysForOas = sortTopLevelKeysForOas;
exports.checkIfRulesetExist = checkIfRulesetExist;
exports.cleanColors = cleanColors;
exports.sendTelemetry = sendTelemetry;
exports.cleanArgs = cleanArgs;
exports.cleanRawInput = cleanRawInput;
exports.checkForDeprecatedOptions = checkForDeprecatedOptions;
exports.notifyAboutIncompatibleConfigOptions = notifyAboutIncompatibleConfigOptions;
exports.formatPath = formatPath;
const path_1 = require("path");
const colorette_1 = require("colorette");
const perf_hooks_1 = require("perf_hooks");
const glob = require("glob");
const fs = require("fs");
const readline = require("readline");
const stream_1 = require("stream");
const child_process_1 = require("child_process");
const util_1 = require("util");
const openapi_core_1 = require("@redocly/openapi-core");
const utils_1 = require("@redocly/openapi-core/lib/utils");
const config_1 = require("@redocly/openapi-core/lib/config");
const reference_docs_config_schema_1 = require("@redocly/config/lib/reference-docs-config-schema");
const types_1 = require("../types");
const update_version_notifier_1 = require("./update-version-notifier");
const push_1 = require("../commands/push");
const fetch_with_timeout_1 = require("./fetch-with-timeout");
async function getFallbackApisOrExit(argsApis, config) {
    const { apis } = config;
    const shouldFallbackToAllDefinitions = !(0, utils_1.isNotEmptyArray)(argsApis) && (0, utils_1.isNotEmptyObject)(apis);
    const res = shouldFallbackToAllDefinitions
        ? fallbackToAllDefinitions(apis, config)
        : await expandGlobsInEntrypoints(argsApis, config);
    const filteredInvalidEntrypoints = res.filter(({ path }) => !isApiPathValid(path));
    if ((0, utils_1.isNotEmptyArray)(filteredInvalidEntrypoints)) {
        for (const { path } of filteredInvalidEntrypoints) {
            process.stderr.write((0, colorette_1.yellow)(`\n${formatPath(path)} ${(0, colorette_1.red)(`does not exist or is invalid.\n\n`)}`));
        }
        exitWithError('Please provide a valid path.');
    }
    return res;
}
function getConfigDirectory(config) {
    return config.configFile ? (0, path_1.dirname)(config.configFile) : process.cwd();
}
function isApiPathValid(apiPath) {
    if (!apiPath.trim()) {
        exitWithError('Path cannot be empty.');
        return;
    }
    return fs.existsSync(apiPath) || (0, openapi_core_1.isAbsoluteUrl)(apiPath) ? apiPath : undefined;
}
function fallbackToAllDefinitions(apis, config) {
    return Object.entries(apis).map(([alias, { root, output }]) => ({
        path: (0, openapi_core_1.isAbsoluteUrl)(root) ? root : (0, path_1.resolve)(getConfigDirectory(config), root),
        alias,
        output: output && (0, path_1.resolve)(getConfigDirectory(config), output),
    }));
}
function getAliasOrPath(config, aliasOrPath) {
    const aliasApi = config.apis[aliasOrPath];
    return aliasApi
        ? {
            path: (0, openapi_core_1.isAbsoluteUrl)(aliasApi.root)
                ? aliasApi.root
                : (0, path_1.resolve)(getConfigDirectory(config), aliasApi.root),
            alias: aliasOrPath,
            output: aliasApi.output && (0, path_1.resolve)(getConfigDirectory(config), aliasApi.output),
        }
        : {
            path: aliasOrPath,
            // find alias by path, take the first match
            alias: Object.entries(config.apis).find(([_alias, api]) => {
                return (0, path_1.resolve)(api.root) === (0, path_1.resolve)(aliasOrPath);
            })?.[0] ?? undefined,
        };
}
async function expandGlobsInEntrypoints(argApis, config) {
    return (await Promise.all(argApis.map(async (aliasOrPath) => {
        return glob.hasMagic(aliasOrPath) && !(0, openapi_core_1.isAbsoluteUrl)(aliasOrPath)
            ? (await (0, util_1.promisify)(glob)(aliasOrPath)).map((g) => getAliasOrPath(config, g))
            : getAliasOrPath(config, aliasOrPath);
    }))).flat();
}
function getExecutionTime(startedAt) {
    return process.env.NODE_ENV === 'test'
        ? '<test>ms'
        : `${Math.ceil(perf_hooks_1.performance.now() - startedAt)}ms`;
}
function printExecutionTime(commandName, startedAt, api) {
    const elapsed = getExecutionTime(startedAt);
    process.stderr.write((0, colorette_1.gray)(`\n${api}: ${commandName} processed in ${elapsed}\n\n`));
}
function pathToFilename(path, pathSeparator) {
    return path
        .replace(/~1/g, '/')
        .replace(/~0/g, '~')
        .replace(/^\//, '')
        .replace(/\//g, pathSeparator);
}
function escapeLanguageName(lang) {
    return lang.replace(/#/g, '_sharp').replace(/\//, '_').replace(/\s/g, '');
}
function langToExt(lang) {
    const langObj = {
        php: '.php',
        'c#': '.cs',
        shell: '.sh',
        curl: '.sh',
        bash: '.sh',
        javascript: '.js',
        js: '.js',
        python: '.py',
        c: '.c',
        'c++': '.cpp',
        coffeescript: '.litcoffee',
        dart: '.dart',
        elixir: '.ex',
        go: '.go',
        groovy: '.groovy',
        java: '.java',
        kotlin: '.kt',
        'objective-c': '.m',
        perl: '.pl',
        powershell: '.ps1',
        ruby: '.rb',
        rust: '.rs',
        scala: '.sc',
        swift: '.swift',
        typescript: '.ts',
        tsx: '.tsx',
    };
    return langObj[lang.toLowerCase()];
}
class CircularJSONNotSupportedError extends Error {
    constructor(originalError) {
        super(originalError.message);
        this.originalError = originalError;
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, CircularJSONNotSupportedError.prototype);
    }
}
exports.CircularJSONNotSupportedError = CircularJSONNotSupportedError;
function dumpBundle(obj, format, dereference) {
    if (format === 'json') {
        try {
            return JSON.stringify(obj, null, 2);
        }
        catch (e) {
            if (e.message.indexOf('circular') > -1) {
                throw new CircularJSONNotSupportedError(e);
            }
            throw e;
        }
    }
    else {
        return (0, openapi_core_1.stringifyYaml)(obj, {
            noRefs: !dereference,
            lineWidth: -1,
        });
    }
}
function saveBundle(filename, output) {
    fs.mkdirSync((0, path_1.dirname)(filename), { recursive: true });
    fs.writeFileSync(filename, output);
}
async function promptUser(query, hideUserInput = false) {
    return new Promise((resolve) => {
        let output = process.stdout;
        let isOutputMuted = false;
        if (hideUserInput) {
            output = new stream_1.Writable({
                write: (chunk, encoding, callback) => {
                    if (!isOutputMuted) {
                        process.stdout.write(chunk, encoding);
                    }
                    callback();
                },
            });
        }
        const rl = readline.createInterface({
            input: process.stdin,
            output,
            terminal: true,
            historySize: hideUserInput ? 0 : 30,
        });
        rl.question(`${query}:\n\n  `, (answer) => {
            rl.close();
            resolve(answer);
        });
        isOutputMuted = hideUserInput;
    });
}
function readYaml(filename) {
    return (0, openapi_core_1.parseYaml)(fs.readFileSync(filename, 'utf-8'), { filename });
}
function writeToFileByExtension(data, filePath, noRefs) {
    const ext = getAndValidateFileExtension(filePath);
    if (ext === 'json') {
        writeJson(data, filePath);
        return;
    }
    writeYaml(data, filePath, noRefs);
}
function writeYaml(data, filename, noRefs = false) {
    const content = (0, openapi_core_1.stringifyYaml)(data, { noRefs });
    if (process.env.NODE_ENV === 'test') {
        process.stderr.write(content);
        return;
    }
    fs.mkdirSync((0, path_1.dirname)(filename), { recursive: true });
    fs.writeFileSync(filename, content);
}
function writeJson(data, filename) {
    const content = JSON.stringify(data, null, 2);
    if (process.env.NODE_ENV === 'test') {
        process.stderr.write(content);
        return;
    }
    fs.mkdirSync((0, path_1.dirname)(filename), { recursive: true });
    fs.writeFileSync(filename, content);
}
function getAndValidateFileExtension(fileName) {
    const ext = fileName.split('.').pop();
    if (['yaml', 'yml', 'json'].includes(ext)) {
        return ext;
    }
    process.stderr.write((0, colorette_1.yellow)(`Unsupported file extension: ${ext}. Using yaml.\n`));
    return 'yaml';
}
function handleError(e, ref) {
    switch (e.constructor) {
        case HandledError: {
            throw e;
        }
        case openapi_core_1.ResolveError:
            return exitWithError(`Failed to resolve API description at ${ref}:\n\n  - ${e.message}`);
        case openapi_core_1.YamlParseError:
            return exitWithError(`Failed to parse API description at ${ref}:\n\n  - ${e.message}`);
        case CircularJSONNotSupportedError: {
            return exitWithError(`Detected circular reference which can't be converted to JSON.\n` +
                `Try to use ${(0, colorette_1.blue)('yaml')} output or remove ${(0, colorette_1.blue)('--dereferenced')}.`);
        }
        case SyntaxError:
            return exitWithError(`Syntax error: ${e.message} ${e.stack?.split('\n\n')?.[0]}`);
        case config_1.ConfigValidationError:
            return exitWithError(e.message);
        default: {
            exitWithError(`Something went wrong when processing ${ref}:\n\n  - ${e.message}`);
        }
    }
}
class HandledError extends Error {
}
exports.HandledError = HandledError;
function printLintTotals(totals, definitionsCount) {
    const ignored = totals.ignored
        ? (0, colorette_1.yellow)(`${totals.ignored} ${(0, utils_1.pluralize)('problem is', totals.ignored)} explicitly ignored.\n\n`)
        : '';
    if (totals.errors > 0) {
        process.stderr.write((0, colorette_1.red)(`❌ Validation failed with ${totals.errors} ${(0, utils_1.pluralize)('error', totals.errors)}${totals.warnings > 0
            ? ` and ${totals.warnings} ${(0, utils_1.pluralize)('warning', totals.warnings)}`
            : ''}.\n${ignored}`));
    }
    else if (totals.warnings > 0) {
        process.stderr.write((0, colorette_1.green)(`Woohoo! Your API ${(0, utils_1.pluralize)('description is', definitionsCount)} valid. 🎉\n`));
        process.stderr.write((0, colorette_1.yellow)(`You have ${totals.warnings} ${(0, utils_1.pluralize)('warning', totals.warnings)}.\n${ignored}`));
    }
    else {
        process.stderr.write((0, colorette_1.green)(`Woohoo! Your API ${(0, utils_1.pluralize)('description is', definitionsCount)} valid. 🎉\n${ignored}`));
    }
    if (totals.errors > 0) {
        process.stderr.write((0, colorette_1.gray)(`run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.\n`));
    }
    process.stderr.write('\n');
}
function printConfigLintTotals(totals, command) {
    if (totals.errors > 0) {
        process.stderr.write((0, colorette_1.red)(`❌ Your config has ${totals.errors} ${(0, utils_1.pluralize)('error', totals.errors)}.`));
    }
    else if (totals.warnings > 0) {
        process.stderr.write((0, colorette_1.yellow)(`⚠️ Your config has ${totals.warnings} ${(0, utils_1.pluralize)('warning', totals.warnings)}.\n`));
    }
    else if (command === 'check-config') {
        process.stderr.write((0, colorette_1.green)('✅  Your config is valid.\n'));
    }
}
function getOutputFileName({ entrypoint, output, argvOutput, ext, entries, }) {
    let outputFile = output || argvOutput;
    if (!outputFile) {
        return { ext: ext || 'yaml' };
    }
    if (entries > 1 && argvOutput) {
        ext = ext || (0, path_1.extname)(entrypoint).substring(1);
        if (!types_1.outputExtensions.includes(ext)) {
            throw new Error(`Invalid file extension: ${ext}.`);
        }
        outputFile = (0, path_1.join)(argvOutput, (0, path_1.basename)(entrypoint, (0, path_1.extname)(entrypoint))) + '.' + ext;
    }
    else {
        ext =
            ext ||
                (0, path_1.extname)(outputFile).substring(1) ||
                (0, path_1.extname)(entrypoint).substring(1);
        if (!types_1.outputExtensions.includes(ext)) {
            throw new Error(`Invalid file extension: ${ext}.`);
        }
        outputFile = (0, path_1.join)((0, path_1.dirname)(outputFile), (0, path_1.basename)(outputFile, (0, path_1.extname)(outputFile))) + '.' + ext;
    }
    return { outputFile, ext };
}
function printUnusedWarnings(config) {
    const { preprocessors, rules, decorators } = config.getUnusedRules();
    if (rules.length) {
        process.stderr.write((0, colorette_1.yellow)(`[WARNING] Unused rules found in ${(0, colorette_1.blue)(config.configFile || '')}: ${rules.join(', ')}.\n`));
    }
    if (preprocessors.length) {
        process.stderr.write((0, colorette_1.yellow)(`[WARNING] Unused preprocessors found in ${(0, colorette_1.blue)(config.configFile || '')}: ${preprocessors.join(', ')}.\n`));
    }
    if (decorators.length) {
        process.stderr.write((0, colorette_1.yellow)(`[WARNING] Unused decorators found in ${(0, colorette_1.blue)(config.configFile || '')}: ${decorators.join(', ')}.\n`));
    }
    if (rules.length || preprocessors.length) {
        process.stderr.write(`Check the spelling and verify the added plugin prefix.\n`);
    }
}
function exitWithError(message) {
    process.stderr.write((0, colorette_1.red)(message) + '\n\n');
    throw new HandledError(message);
}
/**
 * Checks if dir is subdir of parent
 */
function isSubdir(parent, dir) {
    const relativePath = (0, path_1.relative)(parent, dir);
    return !!relativePath && !/^..($|\/)/.test(relativePath) && !(0, path_1.isAbsolute)(relativePath);
}
async function loadConfigAndHandleErrors(options = {}) {
    try {
        return await (0, openapi_core_1.loadConfig)(options);
    }
    catch (e) {
        handleError(e, '');
    }
}
function sortTopLevelKeysForOas(document) {
    if ('swagger' in document) {
        return sortOas2Keys(document);
    }
    return sortOas3Keys(document);
}
function sortOas2Keys(document) {
    const orderedKeys = [
        'swagger',
        'info',
        'host',
        'basePath',
        'schemes',
        'consumes',
        'produces',
        'security',
        'tags',
        'externalDocs',
        'paths',
        'definitions',
        'parameters',
        'responses',
        'securityDefinitions',
    ];
    const result = {};
    for (const key of orderedKeys) {
        if (document.hasOwnProperty(key)) {
            result[key] = document[key];
        }
    }
    // merge any other top-level keys (e.g. vendor extensions)
    return Object.assign(result, document);
}
function sortOas3Keys(document) {
    const orderedKeys = [
        'openapi',
        'info',
        'jsonSchemaDialect',
        'servers',
        'security',
        'tags',
        'externalDocs',
        'paths',
        'webhooks',
        'x-webhooks',
        'components',
    ];
    const result = {};
    for (const key of orderedKeys) {
        if (document.hasOwnProperty(key)) {
            result[key] = document[key];
        }
    }
    // merge any other top-level keys (e.g. vendor extensions)
    return Object.assign(result, document);
}
function checkIfRulesetExist(rules) {
    const ruleset = {
        ...rules.oas2,
        ...rules.oas3_0,
        ...rules.oas3_1,
        ...rules.async2,
        ...rules.async3,
        ...rules.arazzo1,
    };
    if ((0, utils_1.isEmptyObject)(ruleset)) {
        exitWithError('⚠️ No rules were configured. Learn how to configure rules: https://redocly.com/docs/cli/rules/');
    }
}
function cleanColors(input) {
    // eslint-disable-next-line no-control-regex
    return input.replace(/\x1b\[\d+m/g, '');
}
async function sendTelemetry(argv, exit_code, has_config, spec_version, spec_keyword, spec_full_version) {
    try {
        if (!argv) {
            return;
        }
        const { _: [command], $0: _, ...args } = argv;
        const event_time = new Date().toISOString();
        const redoclyClient = new openapi_core_1.RedoclyClient();
        const logged_in = redoclyClient.hasTokens();
        const data = {
            event: 'cli_command',
            event_time,
            logged_in,
            command,
            arguments: cleanArgs(args),
            node_version: process.version,
            npm_version: (0, child_process_1.execSync)('npm -v').toString().replace('\n', ''),
            version: update_version_notifier_1.version,
            exit_code,
            environment: process.env.REDOCLY_ENVIRONMENT,
            environment_ci: process.env.CI,
            raw_input: cleanRawInput(process.argv.slice(2)),
            has_config,
            spec_version,
            spec_keyword,
            spec_full_version,
        };
        await (0, fetch_with_timeout_1.default)(`https://api.redocly.com/registry/telemetry/cli`, {
            timeout: fetch_with_timeout_1.DEFAULT_FETCH_TIMEOUT,
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify(data),
        });
    }
    catch (err) {
        // Do nothing.
    }
}
function isFile(value) {
    return fs.existsSync(value) && fs.statSync(value).isFile();
}
function isDirectory(value) {
    return fs.existsSync(value) && fs.statSync(value).isDirectory();
}
function cleanString(value) {
    if (!value) {
        return value;
    }
    if ((0, openapi_core_1.isAbsoluteUrl)(value)) {
        return value.split('://')[0] + '://url';
    }
    if (isFile(value)) {
        return value.replace(/.+\.([^.]+)$/, (_, ext) => 'file-' + ext);
    }
    if (isDirectory(value)) {
        return 'folder';
    }
    if (push_1.DESTINATION_REGEX.test(value)) {
        return value.startsWith('@') ? '@organization/api-name@api-version' : 'api-name@api-version';
    }
    return value;
}
function cleanArgs(args) {
    const keysToClean = ['organization', 'o'];
    const result = {};
    for (const [key, value] of Object.entries(args)) {
        if (keysToClean.includes(key)) {
            result[key] = '***';
        }
        else if (typeof value === 'string') {
            result[key] = cleanString(value);
        }
        else if (Array.isArray(value)) {
            result[key] = value.map(cleanString);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
function cleanRawInput(argv) {
    return argv.map((entry) => entry.split('=').map(cleanString).join('=')).join(' ');
}
function checkForDeprecatedOptions(argv, deprecatedOptions) {
    for (const option of deprecatedOptions) {
        if (argv[option]) {
            process.stderr.write((0, colorette_1.yellow)(`[WARNING] "${String(option)}" option is deprecated and will be removed in a future release. \n\n`));
        }
    }
}
function notifyAboutIncompatibleConfigOptions(themeOpenapiOptions) {
    if ((0, utils_1.isPlainObject)(themeOpenapiOptions)) {
        const propertiesSet = Object.keys(themeOpenapiOptions);
        const deprecatedSet = Object.keys(reference_docs_config_schema_1.deprecatedRefDocsSchema.properties);
        const intersection = propertiesSet.filter((prop) => deprecatedSet.includes(prop));
        if (intersection.length > 0) {
            process.stderr.write((0, colorette_1.yellow)(`\n${(0, utils_1.pluralize)('Property', intersection.length)} ${(0, colorette_1.gray)(intersection.map((prop) => `'${prop}'`).join(', '))} ${(0, utils_1.pluralize)('is', intersection.length)} only used in API Reference Docs and Redoc version 2.x or earlier.\n\n`));
        }
    }
}
function formatPath(path) {
    if ((0, openapi_core_1.isAbsoluteUrl)(path)) {
        return path;
    }
    return (0, path_1.relative)(process.cwd(), path);
}
