"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformPush = exports.DESTINATION_REGEX = void 0;
exports.commonPushHandler = commonPushHandler;
exports.handlePush = handlePush;
exports.getDestinationProps = getDestinationProps;
exports.getApiRoot = getApiRoot;
const fs = require("fs");
const path = require("path");
const perf_hooks_1 = require("perf_hooks");
const colorette_1 = require("colorette");
const crypto_1 = require("crypto");
const openapi_core_1 = require("@redocly/openapi-core");
const utils_1 = require("@redocly/openapi-core/lib/utils");
const miscellaneous_1 = require("../utils/miscellaneous");
const login_1 = require("./login");
const push_1 = require("../cms/commands/push");
const api_client_1 = require("../cms/api/api-client");
const DEFAULT_VERSION = 'latest';
exports.DESTINATION_REGEX = 
// eslint-disable-next-line no-useless-escape
/^(@(?<organizationId>[\w\-\s]+)\/)?(?<name>[^@]*)@(?<version>[\w\.\-]+)$/;
function commonPushHandler({ project, 'mount-path': mountPath, }) {
    if (project && mountPath) {
        return push_1.handlePush;
    }
    return (0, exports.transformPush)(handlePush);
}
async function handlePush({ argv, config }) {
    const client = new openapi_core_1.RedoclyClient(config.region);
    const isAuthorized = await client.isAuthorizedWithRedoclyByRegion();
    if (!isAuthorized) {
        try {
            const clientToken = await (0, login_1.promptClientToken)(client.domain);
            await client.login(clientToken);
        }
        catch (e) {
            (0, miscellaneous_1.exitWithError)(e);
        }
    }
    const startedAt = perf_hooks_1.performance.now();
    const { destination, branchName, upsert } = argv;
    const jobId = argv['job-id'];
    const batchSize = argv['batch-size'];
    if (destination && !exports.DESTINATION_REGEX.test(destination)) {
        (0, miscellaneous_1.exitWithError)(`Destination argument value is not valid, please use the right format: ${(0, colorette_1.yellow)('<api-name@api-version>')}.`);
    }
    const destinationProps = getDestinationProps(destination, config.organization);
    const organizationId = argv.organization || destinationProps.organizationId;
    const { name, version } = destinationProps;
    if (!organizationId) {
        return (0, miscellaneous_1.exitWithError)(`No organization provided, please use --organization option or specify the 'organization' field in the config file.`);
    }
    const api = argv.api || (name && version && getApiRoot({ name, version, config }));
    if (name && version && !api) {
        (0, miscellaneous_1.exitWithError)(`No api found that matches ${(0, colorette_1.blue)(`${name}@${version}`)}. Please make sure you have provided the correct data in the config file.`);
    }
    // Ensure that a destination for the api is provided.
    if (!name && api) {
        return (0, miscellaneous_1.exitWithError)(`No destination provided, please use --destination option to provide destination.`);
    }
    if (jobId && !jobId.trim()) {
        (0, miscellaneous_1.exitWithError)(`The ${(0, colorette_1.blue)(`job-id`)} option value is not valid, please avoid using an empty string.`);
    }
    if (batchSize && batchSize < 2) {
        (0, miscellaneous_1.exitWithError)(`The ${(0, colorette_1.blue)(`batch-size`)} option value is not valid, please use the integer bigger than 1.`);
    }
    const apis = api ? { [`${name}@${version}`]: { root: api } } : config.apis;
    if (!Object.keys(apis).length) {
        (0, miscellaneous_1.exitWithError)(`Api not found. Please make sure you have provided the correct data in the config file.`);
    }
    for (const [apiNameAndVersion, { root: api }] of Object.entries(apis)) {
        const resolvedConfig = (0, openapi_core_1.getMergedConfig)(config, apiNameAndVersion);
        resolvedConfig.styleguide.skipDecorators(argv['skip-decorator']);
        const [name, version = DEFAULT_VERSION] = apiNameAndVersion.split('@');
        const encodedName = encodeURIComponent(name);
        try {
            let rootFilePath = '';
            const filePaths = [];
            const filesToUpload = await collectFilesToUpload(api, resolvedConfig);
            const filesHash = hashFiles(filesToUpload.files);
            process.stdout.write(`Uploading ${filesToUpload.files.length} ${(0, utils_1.pluralize)('file', filesToUpload.files.length)}:\n`);
            let uploaded = 0;
            for (const file of filesToUpload.files) {
                const { signedUploadUrl, filePath } = await client.registryApi.prepareFileUpload({
                    organizationId,
                    name: encodedName,
                    version,
                    filesHash,
                    filename: file.keyOnS3,
                    isUpsert: upsert,
                });
                if (file.filePath === filesToUpload.root) {
                    rootFilePath = filePath;
                }
                filePaths.push(filePath);
                process.stdout.write(`Uploading ${file.contents ? 'bundle for ' : ''}${(0, colorette_1.blue)(file.filePath)}...`);
                const uploadResponse = await uploadFileToS3(signedUploadUrl, file.contents || file.filePath);
                const fileCounter = `(${++uploaded}/${filesToUpload.files.length})`;
                if (!uploadResponse.ok) {
                    (0, miscellaneous_1.exitWithError)(`✗ ${fileCounter}\nFile upload failed.`);
                }
                process.stdout.write((0, colorette_1.green)(`✓ ${fileCounter}\n`));
            }
            process.stdout.write('\n');
            await client.registryApi.pushApi({
                organizationId,
                name: encodedName,
                version,
                rootFilePath,
                filePaths,
                branch: branchName,
                isUpsert: upsert,
                isPublic: argv['public'],
                batchId: jobId,
                batchSize: batchSize,
            });
        }
        catch (error) {
            if (error.message === 'ORGANIZATION_NOT_FOUND') {
                (0, miscellaneous_1.exitWithError)(`Organization ${(0, colorette_1.blue)(organizationId)} not found.`);
            }
            if (error.message === 'API_VERSION_NOT_FOUND') {
                (0, miscellaneous_1.exitWithError)(`The definition version ${(0, colorette_1.blue)(`${name}@${version}`)} does not exist in organization ${(0, colorette_1.blue)(organizationId)}!\n${(0, colorette_1.yellow)('Suggestion:')} please use ${(0, colorette_1.blue)('-u')} or ${(0, colorette_1.blue)('--upsert')} to create definition.`);
            }
            throw error;
        }
        process.stdout.write(`Definition: ${(0, colorette_1.blue)(api)} is successfully pushed to Redocly API Registry.\n`);
    }
    (0, miscellaneous_1.printExecutionTime)('push', startedAt, api || `apis in organization ${organizationId}`);
}
function getFilesList(dir, files) {
    files = files || [];
    const filesAndDirs = fs.readdirSync(dir);
    for (const name of filesAndDirs) {
        if (fs.statSync(path.join(dir, name)).isDirectory()) {
            files = getFilesList(path.join(dir, name), files);
        }
        else {
            const currentPath = dir + '/' + name;
            files.push(currentPath);
        }
    }
    return files;
}
async function collectFilesToUpload(api, config) {
    const files = [];
    const [{ path: apiPath }] = await (0, miscellaneous_1.getFallbackApisOrExit)([api], config);
    process.stdout.write('Bundling definition\n');
    const { bundle: openapiBundle, problems } = await (0, openapi_core_1.bundle)({
        config,
        ref: apiPath,
        skipRedoclyRegistryRefs: true,
    });
    const fileTotals = (0, openapi_core_1.getTotals)(problems);
    if (fileTotals.errors === 0) {
        process.stdout.write(`Created a bundle for ${(0, colorette_1.blue)(api)} ${fileTotals.warnings > 0 ? 'with warnings' : ''}\n`);
    }
    else {
        (0, miscellaneous_1.exitWithError)(`Failed to create a bundle for ${(0, colorette_1.blue)(api)}.`);
    }
    const fileExt = path.extname(apiPath).split('.').pop();
    files.push(getFileEntry(apiPath, (0, miscellaneous_1.dumpBundle)(openapiBundle.parsed, fileExt)));
    if (fs.existsSync('package.json')) {
        files.push(getFileEntry('package.json'));
    }
    if (fs.existsSync(openapi_core_1.IGNORE_FILE)) {
        files.push(getFileEntry(openapi_core_1.IGNORE_FILE));
    }
    if (config.configFile) {
        // All config file paths including the root one
        files.push(...[...new Set(config.styleguide.extendPaths)].map((f) => getFileEntry(f)));
        if (config.theme?.openapi?.htmlTemplate) {
            const dir = getFolder(config.theme.openapi.htmlTemplate);
            const fileList = getFilesList(dir, []);
            files.push(...fileList.map((f) => getFileEntry(f)));
        }
        const pluginFiles = new Set();
        for (const plugin of config.styleguide.pluginPaths) {
            if (typeof plugin !== 'string')
                continue;
            const fileList = getFilesList(getFolder(plugin), []);
            fileList.forEach((f) => pluginFiles.add(f));
        }
        files.push(...filterPluginFilesByExt(Array.from(pluginFiles)).map((f) => getFileEntry(f)));
    }
    if (config.files) {
        const otherFiles = new Set();
        for (const file of config.files) {
            if (fs.statSync(file).isDirectory()) {
                const fileList = getFilesList(file, []);
                fileList.forEach((f) => otherFiles.add(f));
            }
            else {
                otherFiles.add(file);
            }
        }
        files.push(...Array.from(otherFiles).map((f) => getFileEntry(f)));
    }
    return {
        files,
        root: path.resolve(apiPath),
    };
    function filterPluginFilesByExt(files) {
        return files.filter((file) => {
            const fileExt = path.extname(file).toLowerCase();
            return fileExt === '.js' || fileExt === '.ts' || fileExt === '.mjs' || fileExt === 'json';
        });
    }
    function getFileEntry(filename, contents) {
        return {
            filePath: path.resolve(filename),
            keyOnS3: config.configFile
                ? (0, openapi_core_1.slash)(path.relative(path.dirname(config.configFile), filename))
                : (0, openapi_core_1.slash)(path.basename(filename)),
            contents: (contents && Buffer.from(contents, 'utf-8')) || undefined,
        };
    }
}
function getFolder(filePath) {
    return path.resolve(path.dirname(filePath));
}
function hashFiles(filePaths) {
    const sum = (0, crypto_1.createHash)('sha256');
    filePaths.forEach((file) => sum.update(fs.readFileSync(file.filePath)));
    return sum.digest('hex');
}
function parseDestination(destination) {
    return destination?.match(exports.DESTINATION_REGEX)?.groups;
}
function getDestinationProps(destination, organization) {
    const groups = destination && parseDestination(destination);
    if (groups) {
        return {
            organizationId: groups.organizationId || organization,
            name: groups.name,
            version: groups.version,
        };
    }
    else {
        return { organizationId: organization, name: undefined, version: undefined };
    }
}
const transformPush = (callback) => ({ argv: { apis, branch, 'batch-id': batchId, 'job-id': jobId, ...rest }, config, version, }) => {
    const [maybeApiOrDestination, maybeDestination, maybeBranchName] = apis || [];
    if (batchId) {
        process.stderr.write((0, colorette_1.yellow)(`The ${(0, colorette_1.red)('batch-id')} option is deprecated. Please use ${(0, colorette_1.green)('job-id')} instead.\n\n`));
    }
    if (maybeBranchName) {
        process.stderr.write((0, colorette_1.yellow)('Deprecation warning: Do not use the third parameter as a branch name. Please use a separate --branch option instead.\n\n'));
    }
    let apiFile, destination;
    if (maybeDestination) {
        process.stderr.write((0, colorette_1.yellow)('Deprecation warning: Do not use the second parameter as a destination. Please use a separate --destination and --organization instead.\n\n'));
        apiFile = maybeApiOrDestination;
        destination = maybeDestination;
    }
    else if (maybeApiOrDestination && exports.DESTINATION_REGEX.test(maybeApiOrDestination)) {
        process.stderr.write((0, colorette_1.yellow)('Deprecation warning: Do not use the first parameter as a destination. Please use a separate --destination and --organization options instead.\n\n'));
        destination = maybeApiOrDestination;
    }
    else if (maybeApiOrDestination && !exports.DESTINATION_REGEX.test(maybeApiOrDestination)) {
        apiFile = maybeApiOrDestination;
    }
    return callback({
        argv: {
            ...rest,
            destination: rest.destination ?? destination,
            api: apiFile,
            branchName: branch ?? maybeBranchName,
            'job-id': jobId || batchId,
        },
        config,
        version,
    });
};
exports.transformPush = transformPush;
function getApiRoot({ name, version, config: { apis }, }) {
    const api = apis?.[`${name}@${version}`] || (version === DEFAULT_VERSION && apis?.[name]);
    return api?.root;
}
async function uploadFileToS3(url, filePathOrBuffer) {
    const fileSizeInBytes = typeof filePathOrBuffer === 'string'
        ? fs.statSync(filePathOrBuffer).size
        : filePathOrBuffer.byteLength;
    const readStream = typeof filePathOrBuffer === 'string' ? fs.createReadStream(filePathOrBuffer) : filePathOrBuffer;
    const requestOptions = {
        method: 'PUT',
        headers: {
            'Content-Length': fileSizeInBytes.toString(),
        },
        body: Buffer.isBuffer(readStream)
            ? new Blob([readStream])
            : new Blob([await (0, api_client_1.streamToBuffer)(readStream)]),
    };
    const proxyAgent = (0, openapi_core_1.getProxyAgent)();
    if (proxyAgent) {
        requestOptions.dispatcher = proxyAgent;
    }
    return fetch(url, requestOptions);
}
