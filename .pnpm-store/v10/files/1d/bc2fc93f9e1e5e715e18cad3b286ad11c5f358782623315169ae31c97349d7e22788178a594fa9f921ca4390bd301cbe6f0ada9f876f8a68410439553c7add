/*
  @license
	Rollup.js v2.79.2
	Thu, 26 Sep 2024 18:44:14 GMT - commit 48aef33cf2f2a6dfb175afb3bcd6a977c81f1d5c

	https://github.com/rollup/rollup

	Released under the MIT License.
*/
'use strict';

const require$$0 = require('path');
const process$1 = require('process');
const url = require('url');
const tty = require('tty');
const rollup = require('./rollup.js');
const mergeOptions = require('./mergeOptions.js');

function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: 'Module' } });
  if (e) {
    for (const k in e) {
      n[k] = e[k];
    }
  }
  n.default = e;
  return n;
}

const tty__namespace = /*#__PURE__*/_interopNamespaceDefault(tty);

const {
  env = {},
  argv = [],
  platform = "",
} = typeof process === "undefined" ? {} : process;

const isDisabled = "NO_COLOR" in env || argv.includes("--no-color");
const isForced = "FORCE_COLOR" in env || argv.includes("--color");
const isWindows = platform === "win32";
const isDumbTerminal = env.TERM === "dumb";

const isCompatibleTerminal =
  tty__namespace && tty__namespace.isatty && tty__namespace.isatty(1) && env.TERM && !isDumbTerminal;

const isCI =
  "CI" in env &&
  ("GITHUB_ACTIONS" in env || "GITLAB_CI" in env || "CIRCLECI" in env);

const isColorSupported =
  !isDisabled &&
  (isForced || (isWindows && !isDumbTerminal) || isCompatibleTerminal || isCI);

const replaceClose = (
  index,
  string,
  close,
  replace,
  head = string.substring(0, index) + replace,
  tail = string.substring(index + close.length),
  next = tail.indexOf(close)
) => head + (next < 0 ? tail : replaceClose(next, tail, close, replace));

const clearBleed = (index, string, open, close, replace) =>
  index < 0
    ? open + string + close
    : open + replaceClose(index, string, close, replace) + close;

const filterEmpty =
  (open, close, replace = open, at = open.length + 1) =>
  (string) =>
    string || !(string === "" || string === undefined)
      ? clearBleed(
          ("" + string).indexOf(close, at),
          string,
          open,
          close,
          replace
        )
      : "";

const init = (open, close, replace) =>
  filterEmpty(`\x1b[${open}m`, `\x1b[${close}m`, replace);

const colors = {
  reset: init(0, 0),
  bold: init(1, 22, "\x1b[22m\x1b[1m"),
  dim: init(2, 22, "\x1b[22m\x1b[2m"),
  italic: init(3, 23),
  underline: init(4, 24),
  inverse: init(7, 27),
  hidden: init(8, 28),
  strikethrough: init(9, 29),
  black: init(30, 39),
  red: init(31, 39),
  green: init(32, 39),
  yellow: init(33, 39),
  blue: init(34, 39),
  magenta: init(35, 39),
  cyan: init(36, 39),
  white: init(37, 39),
  gray: init(90, 39),
  bgBlack: init(40, 49),
  bgRed: init(41, 49),
  bgGreen: init(42, 49),
  bgYellow: init(43, 49),
  bgBlue: init(44, 49),
  bgMagenta: init(45, 49),
  bgCyan: init(46, 49),
  bgWhite: init(47, 49),
  blackBright: init(90, 39),
  redBright: init(91, 39),
  greenBright: init(92, 39),
  yellowBright: init(93, 39),
  blueBright: init(94, 39),
  magentaBright: init(95, 39),
  cyanBright: init(96, 39),
  whiteBright: init(97, 39),
  bgBlackBright: init(100, 49),
  bgRedBright: init(101, 49),
  bgGreenBright: init(102, 49),
  bgYellowBright: init(103, 49),
  bgBlueBright: init(104, 49),
  bgMagentaBright: init(105, 49),
  bgCyanBright: init(106, 49),
  bgWhiteBright: init(107, 49),
};

const createColors = ({ useColor = isColorSupported } = {}) =>
  useColor
    ? colors
    : Object.keys(colors).reduce(
        (colors, key) => ({ ...colors, [key]: String }),
        {}
      );

createColors();

// @see https://no-color.org
// @see https://www.npmjs.com/package/chalk
const { bold, cyan, dim, gray, green, red, underline, yellow } = createColors({
    useColor: process$1.env.FORCE_COLOR !== '0' && !process$1.env.NO_COLOR
});

// log to stderr to keep `rollup main.js > bundle.js` from breaking
const stderr = (...args) => process$1.stderr.write(`${args.join('')}\n`);
function handleError(err, recover = false) {
    let description = err.message || err;
    if (err.name)
        description = `${err.name}: ${description}`;
    const message = (err.plugin ? `(plugin ${err.plugin}) ${description}` : description) || err;
    stderr(bold(red(`[!] ${bold(message.toString())}`)));
    if (err.url) {
        stderr(cyan(err.url));
    }
    if (err.loc) {
        stderr(`${rollup.relativeId((err.loc.file || err.id))} (${err.loc.line}:${err.loc.column})`);
    }
    else if (err.id) {
        stderr(rollup.relativeId(err.id));
    }
    if (err.frame) {
        stderr(dim(err.frame));
    }
    if (err.stack) {
        stderr(dim(err.stack));
    }
    stderr('');
    if (!recover)
        process$1.exit(1);
}

function batchWarnings() {
    let count = 0;
    const deferredWarnings = new Map();
    let warningOccurred = false;
    return {
        add(warning) {
            count += 1;
            warningOccurred = true;
            if (warning.code in deferredHandlers) {
                rollup.getOrCreate(deferredWarnings, warning.code, () => []).push(warning);
            }
            else if (warning.code in immediateHandlers) {
                immediateHandlers[warning.code](warning);
            }
            else {
                title(warning.message);
                if (warning.url)
                    info(warning.url);
                const id = (warning.loc && warning.loc.file) || warning.id;
                if (id) {
                    const loc = warning.loc
                        ? `${rollup.relativeId(id)} (${warning.loc.line}:${warning.loc.column})`
                        : rollup.relativeId(id);
                    stderr(bold(rollup.relativeId(loc)));
                }
                if (warning.frame)
                    info(warning.frame);
            }
        },
        get count() {
            return count;
        },
        flush() {
            if (count === 0)
                return;
            const codes = Array.from(deferredWarnings.keys()).sort((a, b) => deferredWarnings.get(b).length - deferredWarnings.get(a).length);
            for (const code of codes) {
                deferredHandlers[code](deferredWarnings.get(code));
            }
            deferredWarnings.clear();
            count = 0;
        },
        get warningOccurred() {
            return warningOccurred;
        }
    };
}
const immediateHandlers = {
    MISSING_NODE_BUILTINS(warning) {
        title(`Missing shims for Node.js built-ins`);
        stderr(`Creating a browser bundle that depends on ${rollup.printQuotedStringList(warning.modules)}. You might need to include https://github.com/FredKSchott/rollup-plugin-polyfill-node`);
    },
    UNKNOWN_OPTION(warning) {
        title(`You have passed an unrecognized option`);
        stderr(warning.message);
    }
};
const deferredHandlers = {
    CIRCULAR_DEPENDENCY(warnings) {
        title(`Circular dependenc${warnings.length > 1 ? 'ies' : 'y'}`);
        const displayed = warnings.length > 5 ? warnings.slice(0, 3) : warnings;
        for (const warning of displayed) {
            stderr(warning.cycle.join(' -> '));
        }
        if (warnings.length > displayed.length) {
            stderr(`...and ${warnings.length - displayed.length} more`);
        }
    },
    EMPTY_BUNDLE(warnings) {
        title(`Generated${warnings.length === 1 ? ' an' : ''} empty ${warnings.length > 1 ? 'chunks' : 'chunk'}`);
        stderr(warnings.map(warning => warning.chunkName).join(', '));
    },
    EVAL(warnings) {
        title('Use of eval is strongly discouraged');
        info('https://rollupjs.org/guide/en/#avoiding-eval');
        showTruncatedWarnings(warnings);
    },
    MISSING_EXPORT(warnings) {
        title('Missing exports');
        info('https://rollupjs.org/guide/en/#error-name-is-not-exported-by-module');
        for (const warning of warnings) {
            stderr(bold(warning.importer));
            stderr(`${warning.missing} is not exported by ${warning.exporter}`);
            stderr(gray(warning.frame));
        }
    },
    MISSING_GLOBAL_NAME(warnings) {
        title(`Missing global variable ${warnings.length > 1 ? 'names' : 'name'}`);
        stderr(`Use output.globals to specify browser global variable names corresponding to external modules`);
        for (const warning of warnings) {
            stderr(`${bold(warning.source)} (guessing '${warning.guess}')`);
        }
    },
    MIXED_EXPORTS(warnings) {
        title('Mixing named and default exports');
        info(`https://rollupjs.org/guide/en/#outputexports`);
        stderr(bold('The following entry modules are using named and default exports together:'));
        warnings.sort((a, b) => (a.id < b.id ? -1 : 1));
        const displayedWarnings = warnings.length > 5 ? warnings.slice(0, 3) : warnings;
        for (const warning of displayedWarnings) {
            stderr(rollup.relativeId(warning.id));
        }
        if (displayedWarnings.length < warnings.length) {
            stderr(`...and ${warnings.length - displayedWarnings.length} other entry modules`);
        }
        stderr(`\nConsumers of your bundle will have to use chunk['default'] to access their default export, which may not be what you want. Use \`output.exports: 'named'\` to disable this warning`);
    },
    NAMESPACE_CONFLICT(warnings) {
        title(`Conflicting re-exports`);
        for (const warning of warnings) {
            stderr(`"${bold(rollup.relativeId(warning.reexporter))}" re-exports "${warning.name}" from both "${rollup.relativeId(warning.sources[0])}" and "${rollup.relativeId(warning.sources[1])}" (will be ignored)`);
        }
    },
    NON_EXISTENT_EXPORT(warnings) {
        title(`Import of non-existent ${warnings.length > 1 ? 'exports' : 'export'}`);
        showTruncatedWarnings(warnings);
    },
    PLUGIN_WARNING(warnings) {
        var _a;
        const nestedByPlugin = nest(warnings, 'plugin');
        for (const { key: plugin, items } of nestedByPlugin) {
            const nestedByMessage = nest(items, 'message');
            let lastUrl = '';
            for (const { key: message, items } of nestedByMessage) {
                title(`Plugin ${plugin}: ${message}`);
                for (const warning of items) {
                    if (warning.url && warning.url !== lastUrl)
                        info((lastUrl = warning.url));
                    const id = warning.id || ((_a = warning.loc) === null || _a === void 0 ? void 0 : _a.file);
                    if (id) {
                        let loc = rollup.relativeId(id);
                        if (warning.loc) {
                            loc += `: (${warning.loc.line}:${warning.loc.column})`;
                        }
                        stderr(bold(loc));
                    }
                    if (warning.frame)
                        info(warning.frame);
                }
            }
        }
    },
    SOURCEMAP_BROKEN(warnings) {
        title(`Broken sourcemap`);
        info('https://rollupjs.org/guide/en/#warning-sourcemap-is-likely-to-be-incorrect');
        const plugins = [...new Set(warnings.map(({ plugin }) => plugin).filter(Boolean))];
        stderr(`Plugins that transform code (such as ${rollup.printQuotedStringList(plugins)}) should generate accompanying sourcemaps`);
    },
    THIS_IS_UNDEFINED(warnings) {
        title('`this` has been rewritten to `undefined`');
        info('https://rollupjs.org/guide/en/#error-this-is-undefined');
        showTruncatedWarnings(warnings);
    },
    UNRESOLVED_IMPORT(warnings) {
        title('Unresolved dependencies');
        info('https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency');
        const dependencies = new Map();
        for (const warning of warnings) {
            rollup.getOrCreate(dependencies, warning.source, () => []).push(warning.importer);
        }
        for (const [dependency, importers] of dependencies) {
            stderr(`${bold(dependency)} (imported by ${importers.join(', ')})`);
        }
    },
    UNUSED_EXTERNAL_IMPORT(warnings) {
        title('Unused external imports');
        for (const warning of warnings) {
            stderr(warning.names +
                ' imported from external module "' +
                warning.source +
                '" but never used in ' +
                rollup.printQuotedStringList(warning.sources.map(id => rollup.relativeId(id))));
        }
    }
};
function title(str) {
    stderr(bold(yellow(`(!) ${str}`)));
}
function info(url) {
    stderr(gray(url));
}
function nest(array, prop) {
    const nested = [];
    const lookup = new Map();
    for (const item of array) {
        const key = item[prop];
        rollup.getOrCreate(lookup, key, () => {
            const items = {
                items: [],
                key
            };
            nested.push(items);
            return items;
        }).items.push(item);
    }
    return nested;
}
function showTruncatedWarnings(warnings) {
    const nestedByModule = nest(warnings, 'id');
    const displayedByModule = nestedByModule.length > 5 ? nestedByModule.slice(0, 3) : nestedByModule;
    for (const { key: id, items } of displayedByModule) {
        stderr(bold(rollup.relativeId(id)));
        stderr(gray(items[0].frame));
        if (items.length > 1) {
            stderr(`...and ${items.length - 1} other ${items.length > 2 ? 'occurrences' : 'occurrence'}`);
        }
    }
    if (nestedByModule.length > displayedByModule.length) {
        stderr(`\n...and ${nestedByModule.length - displayedByModule.length} other files`);
    }
}

const stdinName = '-';
let stdinResult = null;
function stdinPlugin(arg) {
    const suffix = typeof arg == 'string' && arg.length ? '.' + arg : '';
    return {
        load(id) {
            if (id === stdinName || id.startsWith(stdinName + '.')) {
                return stdinResult || (stdinResult = readStdin());
            }
        },
        name: 'stdin',
        resolveId(id) {
            if (id === stdinName) {
                return id + suffix;
            }
        }
    };
}
function readStdin() {
    return new Promise((resolve, reject) => {
        const chunks = [];
        process$1.stdin.setEncoding('utf8');
        process$1.stdin
            .on('data', chunk => chunks.push(chunk))
            .on('end', () => {
            const result = chunks.join('');
            resolve(result);
        })
            .on('error', err => {
            reject(err);
        });
    });
}

function waitForInputPlugin() {
    return {
        async buildStart(options) {
            const inputSpecifiers = Array.isArray(options.input)
                ? options.input
                : Object.keys(options.input);
            let lastAwaitedSpecifier = null;
            checkSpecifiers: while (true) {
                for (const specifier of inputSpecifiers) {
                    if ((await this.resolve(specifier)) === null) {
                        if (lastAwaitedSpecifier !== specifier) {
                            stderr(`waiting for input ${bold(specifier)}...`);
                            lastAwaitedSpecifier = specifier;
                        }
                        await new Promise(resolve => setTimeout(resolve, 500));
                        continue checkSpecifiers;
                    }
                }
                break;
            }
        },
        name: 'wait-for-input'
    };
}

async function addCommandPluginsToInputOptions(inputOptions, command) {
    if (command.stdin !== false) {
        inputOptions.plugins.push(stdinPlugin(command.stdin));
    }
    if (command.waitForBundleInput === true) {
        inputOptions.plugins.push(waitForInputPlugin());
    }
    await addPluginsFromCommandOption(command.plugin, inputOptions);
}
async function addPluginsFromCommandOption(commandPlugin, inputOptions) {
    if (commandPlugin) {
        const plugins = Array.isArray(commandPlugin) ? commandPlugin : [commandPlugin];
        for (const plugin of plugins) {
            if (/[={}]/.test(plugin)) {
                // -p plugin=value
                // -p "{transform(c,i){...}}"
                await loadAndRegisterPlugin(inputOptions, plugin);
            }
            else {
                // split out plugins joined by commas
                // -p node-resolve,commonjs,buble
                for (const p of plugin.split(',')) {
                    await loadAndRegisterPlugin(inputOptions, p);
                }
            }
        }
    }
}
async function loadAndRegisterPlugin(inputOptions, pluginText) {
    let plugin = null;
    let pluginArg = undefined;
    if (pluginText[0] === '{') {
        // -p "{transform(c,i){...}}"
        plugin = new Function('return ' + pluginText);
    }
    else {
        const match = pluginText.match(/^([@.:/\\\w|^{}-]+)(=(.*))?$/);
        if (match) {
            // -p plugin
            // -p plugin=arg
            pluginText = match[1];
            pluginArg = new Function('return ' + match[3])();
        }
        else {
            throw new Error(`Invalid --plugin argument format: ${JSON.stringify(pluginText)}`);
        }
        if (!/^\.|^rollup-plugin-|[@/\\]/.test(pluginText)) {
            // Try using plugin prefix variations first if applicable.
            // Prefix order is significant - left has higher precedence.
            for (const prefix of ['@rollup/plugin-', 'rollup-plugin-']) {
                try {
                    plugin = await requireOrImport(prefix + pluginText);
                    break;
                }
                catch (_a) {
                    // if this does not work, we try requiring the actual name below
                }
            }
        }
        if (!plugin) {
            try {
                if (pluginText[0] == '.')
                    pluginText = require$$0.resolve(pluginText);
                // Windows absolute paths must be specified as file:// protocol URL
                // Note that we do not have coverage for Windows-only code paths
                else if (pluginText.match(/^[A-Za-z]:\\/)) {
                    pluginText = url.pathToFileURL(require$$0.resolve(pluginText)).href;
                }
                plugin = await requireOrImport(pluginText);
            }
            catch (err) {
                throw new Error(`Cannot load plugin "${pluginText}": ${err.message}.`);
            }
        }
    }
    // some plugins do not use `module.exports` for their entry point,
    // in which case we try the named default export and the plugin name
    if (typeof plugin === 'object') {
        plugin = plugin.default || plugin[getCamelizedPluginBaseName(pluginText)];
    }
    if (!plugin) {
        throw new Error(`Cannot find entry for plugin "${pluginText}". The plugin needs to export a function either as "default" or "${getCamelizedPluginBaseName(pluginText)}" for Rollup to recognize it.`);
    }
    inputOptions.plugins.push(typeof plugin === 'function' ? plugin.call(plugin, pluginArg) : plugin);
}
function getCamelizedPluginBaseName(pluginText) {
    var _a;
    return (((_a = pluginText.match(/(@rollup\/plugin-|rollup-plugin-)(.+)$/)) === null || _a === void 0 ? void 0 : _a[2]) || pluginText)
        .split(/[\\/]/)
        .slice(-1)[0]
        .split('.')[0]
        .split('-')
        .map((part, index) => (index === 0 || !part ? part : part[0].toUpperCase() + part.slice(1)))
        .join('');
}
async function requireOrImport(pluginPath) {
    try {
        return require(pluginPath);
    }
    catch (_a) {
        return import(pluginPath);
    }
}

function supportsNativeESM() {
    return Number(/^v(\d+)/.exec(process$1.version)[1]) >= 13;
}
async function loadAndParseConfigFile(fileName, commandOptions = {}) {
    const configs = await loadConfigFile(fileName, commandOptions);
    const warnings = batchWarnings();
    try {
        const normalizedConfigs = [];
        for (const config of configs) {
            const options = mergeOptions.mergeOptions(config, commandOptions, warnings.add);
            await addCommandPluginsToInputOptions(options, commandOptions);
            normalizedConfigs.push(options);
        }
        return { options: normalizedConfigs, warnings };
    }
    catch (err) {
        warnings.flush();
        throw err;
    }
}
async function loadConfigFile(fileName, commandOptions) {
    const extension = require$$0.extname(fileName);
    const configFileExport = commandOptions.configPlugin ||
        !(extension === '.cjs' || (extension === '.mjs' && supportsNativeESM()))
        ? await getDefaultFromTranspiledConfigFile(fileName, commandOptions)
        : extension === '.cjs'
            ? getDefaultFromCjs(require(fileName))
            : (await import(url.pathToFileURL(fileName).href)).default;
    return getConfigList(configFileExport, commandOptions);
}
function getDefaultFromCjs(namespace) {
    return namespace.__esModule ? namespace.default : namespace;
}
async function getDefaultFromTranspiledConfigFile(fileName, commandOptions) {
    const warnings = batchWarnings();
    const inputOptions = {
        external: (id) => (id[0] !== '.' && !require$$0.isAbsolute(id)) || id.slice(-5, id.length) === '.json',
        input: fileName,
        onwarn: warnings.add,
        plugins: [],
        treeshake: false
    };
    await addPluginsFromCommandOption(commandOptions.configPlugin, inputOptions);
    const bundle = await rollup.rollup(inputOptions);
    if (!commandOptions.silent && warnings.count > 0) {
        stderr(bold(`loaded ${rollup.relativeId(fileName)} with warnings`));
        warnings.flush();
    }
    const { output: [{ code }] } = await bundle.generate({
        exports: 'named',
        format: 'cjs',
        plugins: [
            {
                name: 'transpile-import-meta',
                resolveImportMeta(property, { moduleId }) {
                    if (property === 'url') {
                        return `'${url.pathToFileURL(moduleId).href}'`;
                    }
                    if (property == null) {
                        return `{url:'${url.pathToFileURL(moduleId).href}'}`;
                    }
                }
            }
        ]
    });
    return loadConfigFromBundledFile(fileName, code);
}
function loadConfigFromBundledFile(fileName, bundledCode) {
    const resolvedFileName = require.resolve(fileName);
    const extension = require$$0.extname(resolvedFileName);
    const defaultLoader = require.extensions[extension];
    require.extensions[extension] = (module, requiredFileName) => {
        if (requiredFileName === resolvedFileName) {
            module._compile(bundledCode, requiredFileName);
        }
        else {
            if (defaultLoader) {
                defaultLoader(module, requiredFileName);
            }
        }
    };
    delete require.cache[resolvedFileName];
    try {
        const config = getDefaultFromCjs(require(fileName));
        require.extensions[extension] = defaultLoader;
        return config;
    }
    catch (err) {
        if (err.code === 'ERR_REQUIRE_ESM') {
            return rollup.error({
                code: 'TRANSPILED_ESM_CONFIG',
                message: `While loading the Rollup configuration from "${rollup.relativeId(fileName)}", Node tried to require an ES module from a CommonJS file, which is not supported. A common cause is if there is a package.json file with "type": "module" in the same folder. You can try to fix this by changing the extension of your configuration file to ".cjs" or ".mjs" depending on the content, which will prevent Rollup from trying to preprocess the file but rather hand it to Node directly.`,
                url: 'https://rollupjs.org/guide/en/#using-untranspiled-config-files'
            });
        }
        throw err;
    }
}
async function getConfigList(configFileExport, commandOptions) {
    const config = await (typeof configFileExport === 'function'
        ? configFileExport(commandOptions)
        : configFileExport);
    if (Object.keys(config).length === 0) {
        return rollup.error({
            code: 'MISSING_CONFIG',
            message: 'Config file must export an options object, or an array of options objects',
            url: 'https://rollupjs.org/guide/en/#configuration-files'
        });
    }
    return Array.isArray(config) ? config : [config];
}

exports.addCommandPluginsToInputOptions = addCommandPluginsToInputOptions;
exports.batchWarnings = batchWarnings;
exports.bold = bold;
exports.cyan = cyan;
exports.green = green;
exports.handleError = handleError;
exports.loadAndParseConfigFile = loadAndParseConfigFile;
exports.stderr = stderr;
exports.stdinName = stdinName;
exports.underline = underline;
//# sourceMappingURL=loadConfigFile.js.map
