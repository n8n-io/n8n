"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewDocs = previewDocs;
exports.debounce = debounce;
const colorette = require("colorette");
const chockidar = require("chokidar");
const openapi_core_1 = require("@redocly/openapi-core");
const miscellaneous_1 = require("../../utils/miscellaneous");
const preview_server_1 = require("./preview-server/preview-server");
async function previewDocs({ argv, config: configFromFile, }) {
    let isAuthorizedWithRedocly = false;
    let redocOptions = {};
    let config = await reloadConfig(configFromFile);
    const apis = await (0, miscellaneous_1.getFallbackApisOrExit)(argv.api ? [argv.api] : [], config);
    const api = apis[0];
    let cachedBundle;
    const deps = new Set();
    async function getBundle() {
        return cachedBundle;
    }
    async function updateBundle() {
        process.stdout.write('\nBundling...\n\n');
        try {
            const { bundle: openapiBundle, problems, fileDependencies, } = await (0, openapi_core_1.bundle)({
                ref: api.path,
                config,
            });
            const removed = [...deps].filter((x) => !fileDependencies.has(x));
            watcher.unwatch(removed);
            watcher.add([...fileDependencies]);
            deps.clear();
            fileDependencies.forEach(deps.add, deps);
            const fileTotals = (0, openapi_core_1.getTotals)(problems);
            if (fileTotals.errors === 0) {
                process.stdout.write(fileTotals.errors === 0
                    ? `Created a bundle for ${api.alias || api.path} ${fileTotals.warnings > 0 ? 'with warnings' : 'successfully'}\n`
                    : colorette.yellow(`Created a bundle for ${api.alias || api.path} with errors. Docs may be broken or not accurate\n`));
            }
            return openapiBundle.parsed;
        }
        catch (e) {
            (0, miscellaneous_1.handleError)(e, api.path);
        }
    }
    setImmediate(() => {
        cachedBundle = updateBundle();
    }); // initial cache
    const isAuthorized = isAuthorizedWithRedocly || redocOptions.licenseKey;
    if (!isAuthorized) {
        process.stderr.write(`Using Redoc community edition.\nLogin with redocly ${colorette.blue('login')} or use an enterprise license key to preview with the premium docs.\n\n`);
    }
    const hotClients = await (0, preview_server_1.default)(argv.port, argv.host, {
        getBundle,
        getOptions: () => redocOptions,
        useRedocPro: isAuthorized && !redocOptions.useCommunityEdition,
    });
    const watchPaths = [api.path, config.configFile].filter((e) => !!e);
    const watcher = chockidar.watch(watchPaths, {
        disableGlobbing: true,
        ignoreInitial: true,
    });
    const debouncedUpdatedBundle = debounce(async () => {
        cachedBundle = updateBundle();
        await cachedBundle;
        hotClients.broadcast('{"type": "reload", "bundle": true}');
    }, 2000);
    const changeHandler = async (type, file) => {
        process.stdout.write(`${colorette.green('watch')} ${type} ${colorette.blue(file)}\n`);
        if (file === config.configFile) {
            config = await reloadConfig();
            hotClients.broadcast(JSON.stringify({ type: 'reload' }));
            return;
        }
        debouncedUpdatedBundle();
    };
    watcher.on('change', changeHandler.bind(undefined, 'changed'));
    watcher.on('add', changeHandler.bind(undefined, 'added'));
    watcher.on('unlink', changeHandler.bind(undefined, 'removed'));
    watcher.on('ready', () => {
        process.stdout.write(`\n  👀  Watching ${colorette.blue(api.path)} and all related resources for changes\n\n`);
    });
    async function reloadConfig(config) {
        if (!config) {
            try {
                config = (await (0, miscellaneous_1.loadConfigAndHandleErrors)({ configPath: argv.config }));
            }
            catch (err) {
                config = new openapi_core_1.Config({ apis: {}, styleguide: {} });
            }
        }
        const redoclyClient = new openapi_core_1.RedoclyClient();
        isAuthorizedWithRedocly = await redoclyClient.isAuthorizedWithRedocly();
        const resolvedConfig = (0, openapi_core_1.getMergedConfig)(config, argv.api);
        const { styleguide } = resolvedConfig;
        styleguide.skipPreprocessors(argv['skip-preprocessor']);
        styleguide.skipDecorators(argv['skip-decorator']);
        const referenceDocs = resolvedConfig.theme?.openapi;
        redocOptions = {
            ...referenceDocs,
            useCommunityEdition: argv['use-community-edition'] || referenceDocs?.useCommunityEdition,
            licenseKey: process.env.REDOCLY_LICENSE_KEY || referenceDocs?.licenseKey,
            whiteLabel: true,
        };
        return resolvedConfig;
    }
}
// eslint-disable-next-line @typescript-eslint/ban-types
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const context = this;
        const later = () => {
            timeout = null;
            if (!immediate)
                func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow)
            func.apply(context, args);
    };
}
