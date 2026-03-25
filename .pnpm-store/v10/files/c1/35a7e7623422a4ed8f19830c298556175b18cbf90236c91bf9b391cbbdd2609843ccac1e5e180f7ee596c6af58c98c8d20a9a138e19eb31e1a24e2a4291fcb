"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stats = exports.version = exports.port = exports.logs = exports.restartOne = exports.restartMany = exports.restartAll = exports.push = exports.images = exports.ps = exports.configVolumes = exports.configServices = exports.config = exports.pullOne = exports.pullMany = exports.pullAll = exports.createOne = exports.createMany = exports.createAll = exports.buildOne = exports.buildMany = exports.buildAll = exports.run = exports.exec = exports.rm = exports.kill = exports.unpauseOne = exports.pauseOne = exports.stopMany = exports.stopOne = exports.stop = exports.downOne = exports.downMany = exports.down = exports.downAll = exports.upOne = exports.upMany = exports.upAll = exports.execCompose = exports.mapImListOutput = exports.mapPsOutput = void 0;
const child_process_1 = __importDefault(require("child_process"));
const yaml_1 = __importDefault(require("yaml"));
const map_ports_1 = __importDefault(require("./map-ports"));
const nonEmptyString = (v) => v !== '';
const arrayIncludesTuple = (arr, tuple) => {
    return arr.some((subArray) => Array.isArray(subArray) &&
        subArray.length === tuple.length &&
        subArray.every((value, index) => value === tuple[index]));
};
const mapPsOutput = (output, options) => {
    let isQuiet = false;
    let isJson = false;
    if (options?.commandOptions) {
        isQuiet =
            options.commandOptions.includes('-q') ||
                options.commandOptions.includes('--quiet') ||
                options.commandOptions.includes('--services');
        isJson = arrayIncludesTuple(options.commandOptions, ['--format', 'json']);
    }
    const services = output
        .split(`\n`)
        .filter(nonEmptyString)
        .filter((_, index) => isQuiet || isJson || index >= 1)
        .map((line) => {
        let nameFragment = line;
        let commandFragment = '';
        let stateFragment = '';
        let untypedPortsFragment = '';
        if (!isQuiet) {
            if (isJson) {
                const serviceLine = JSON.parse(line);
                nameFragment = serviceLine.Name;
                commandFragment = serviceLine.Command;
                stateFragment = serviceLine.State;
                untypedPortsFragment = serviceLine.Ports;
            }
            else {
                const lineColumns = line.split(/\s{3,}/);
                // the line has the columns in the following order:
                // NAME   IMAGE   COMMAND   SERVICE   CREATED   STATUS   PORTS
                // @see https://docs.docker.com/engine/reference/commandline/compose_ps/#description
                nameFragment = lineColumns[0];
                commandFragment = lineColumns[2];
                stateFragment = lineColumns[5];
                untypedPortsFragment = lineColumns[6];
            }
        }
        return {
            name: nameFragment.trim(),
            command: commandFragment.trim(),
            state: stateFragment.trim(),
            ports: (0, map_ports_1.default)(untypedPortsFragment.trim())
        };
    });
    return { services };
};
exports.mapPsOutput = mapPsOutput;
const mapImListOutput = (output, options) => {
    let isQuiet = false;
    let isJson = false;
    if (options?.commandOptions) {
        isQuiet =
            options.commandOptions.includes('-q') ||
                options.commandOptions.includes('--quiet');
        isJson = arrayIncludesTuple(options.commandOptions, ['--format', 'json']);
    }
    if (isJson) {
        const data = JSON.parse(output);
        const services = data.map((serviceLine) => {
            let idFragment = serviceLine.ID;
            // trim json 64B id format "type:id" to 12B id
            const idTypeIndex = idFragment.indexOf(':');
            if (idTypeIndex > 0)
                idFragment = idFragment.slice(idTypeIndex + 1, idTypeIndex + 13);
            return {
                container: serviceLine.ContainerName,
                repository: serviceLine.Repository,
                tag: serviceLine.Tag,
                id: idFragment
            };
        });
        return { services };
    }
    const services = output
        .split(`\n`)
        .filter(nonEmptyString)
        .filter((_, index) => isQuiet || isJson || index >= 1)
        .map((line) => {
        // the line has the columns in the following order:
        // CONTAINER   REPOSITORY   TAG   IMAGE ID   SIZE
        const lineColumns = line.split(/\s{3,}/);
        const containerFragment = lineColumns[0] || line;
        const repositoryFragment = lineColumns[1] || '';
        const tagFragment = lineColumns[2] || '';
        const idFragment = lineColumns[3] || '';
        return {
            container: containerFragment.trim(),
            repository: repositoryFragment.trim(),
            tag: tagFragment.trim(),
            id: idFragment.trim()
        };
    });
    return { services };
};
exports.mapImListOutput = mapImListOutput;
/**
 * Converts supplied yml files to cli arguments
 * https://docs.docker.com/compose/reference/overview/#use--f-to-specify-name-and-path-of-one-or-more-compose-files
 */
const configToArgs = (config) => {
    if (typeof config === 'undefined') {
        return [];
    }
    else if (typeof config === 'string') {
        return ['-f', config];
    }
    else if (config instanceof Array) {
        return config.reduce((args, item) => args.concat(['-f', item]), []);
    }
    throw new Error(`Invalid argument supplied: ${config}`);
};
/**
 * Converts docker compose commandline options to cli arguments
 */
const composeOptionsToArgs = (composeOptions) => {
    let composeArgs = [];
    composeOptions.forEach((option) => {
        if (option instanceof Array) {
            composeArgs = composeArgs.concat(option);
        }
        if (typeof option === 'string') {
            composeArgs = composeArgs.concat([option]);
        }
    });
    return composeArgs;
};
/**
 * Executes docker compose command with common options
 */
const execCompose = (command, args, options = {}) => new Promise((resolve, reject) => {
    const composeOptions = options.composeOptions || [];
    const commandOptions = options.commandOptions || [];
    let composeArgs = composeOptionsToArgs(composeOptions);
    const isConfigProvidedAsString = !!options.configAsString;
    const configArgs = isConfigProvidedAsString
        ? ['-f', '-']
        : configToArgs(options.config);
    composeArgs = composeArgs.concat(configArgs.concat([command].concat(composeOptionsToArgs(commandOptions), args)));
    const cwd = options.cwd;
    const env = options.env || undefined;
    const executable = options.executable;
    let executablePath;
    let executableArgs = [];
    if (executable?.standalone && !executable.executablePath) {
        executablePath = 'docker-compose';
    }
    else {
        executablePath = executable?.executablePath || 'docker';
        const executableOptions = executable?.options || [];
        executableArgs = [...composeOptionsToArgs(executableOptions), 'compose'];
    }
    const childProc = child_process_1.default.spawn(executablePath, [...executableArgs, ...composeArgs], {
        cwd,
        env
    });
    childProc.on('error', (err) => {
        reject(err);
    });
    const result = {
        exitCode: null,
        err: '',
        out: ''
    };
    childProc.stdout.on('data', (chunk) => {
        result.out += chunk.toString();
        options.callback?.(chunk, 'stdout');
    });
    childProc.stderr.on('data', (chunk) => {
        result.err += chunk.toString();
        options.callback?.(chunk, 'stderr');
    });
    childProc.on('exit', (exitCode) => {
        result.exitCode = exitCode;
        setTimeout(() => {
            if (exitCode === 0) {
                resolve(result);
            }
            else {
                reject(result);
            }
        }, 500);
    });
    if (isConfigProvidedAsString) {
        childProc.stdin.write(options.configAsString);
        childProc.stdin.end();
    }
    if (options.log) {
        childProc.stdout.pipe(process.stdout);
        childProc.stderr.pipe(process.stderr);
    }
});
exports.execCompose = execCompose;
/**
 * Determines whether or not to use the default non-interactive flag -d for up commands
 */
const shouldUseDefaultNonInteractiveFlag = function (options = {}) {
    const commandOptions = options.commandOptions || [];
    const noDetachModeFlags = [
        '--abort-on-container-exit',
        '--no-start',
        '--attach',
        '--attach-dependencies',
        '--exit-code-from'
    ];
    const containsOtherNonInteractiveFlag = commandOptions.reduce((memo, item) => {
        return memo && noDetachModeFlags.every((flag) => !item.includes(flag));
    }, true);
    return containsOtherNonInteractiveFlag;
};
const upAll = function (options) {
    const args = shouldUseDefaultNonInteractiveFlag(options) ? ['-d'] : [];
    return (0, exports.execCompose)('up', args, options);
};
exports.upAll = upAll;
const upMany = function (services, options) {
    const args = shouldUseDefaultNonInteractiveFlag(options)
        ? ['-d'].concat(services)
        : services;
    return (0, exports.execCompose)('up', args, options);
};
exports.upMany = upMany;
const upOne = function (service, options) {
    const args = shouldUseDefaultNonInteractiveFlag(options)
        ? ['-d', service]
        : [service];
    return (0, exports.execCompose)('up', args, options);
};
exports.upOne = upOne;
const downAll = function (options) {
    return (0, exports.execCompose)('down', [], options);
};
exports.downAll = downAll;
exports.down = exports.downAll;
const downMany = function (services, options) {
    const args = services;
    return (0, exports.execCompose)('down', args, options);
};
exports.downMany = downMany;
const downOne = function (service, options) {
    const args = [service];
    return (0, exports.execCompose)('down', args, options);
};
exports.downOne = downOne;
const stop = function (options) {
    return (0, exports.execCompose)('stop', [], options);
};
exports.stop = stop;
const stopOne = function (service, options) {
    return (0, exports.execCompose)('stop', [service], options);
};
exports.stopOne = stopOne;
const stopMany = function (options, ...services) {
    return (0, exports.execCompose)('stop', [...services], options);
};
exports.stopMany = stopMany;
const pauseOne = function (service, options) {
    return (0, exports.execCompose)('pause', [service], options);
};
exports.pauseOne = pauseOne;
const unpauseOne = function (service, options) {
    return (0, exports.execCompose)('unpause', [service], options);
};
exports.unpauseOne = unpauseOne;
const kill = function (options) {
    return (0, exports.execCompose)('kill', [], options);
};
exports.kill = kill;
const rm = function (options, ...services) {
    return (0, exports.execCompose)('rm', ['-f', ...services], options);
};
exports.rm = rm;
const exec = function (container, command, options) {
    const args = Array.isArray(command) ? command : command.split(/\s+/);
    return (0, exports.execCompose)('exec', ['-T', container].concat(args), options);
};
exports.exec = exec;
const run = function (container, command, options) {
    const args = Array.isArray(command) ? command : command.split(/\s+/);
    return (0, exports.execCompose)('run', ['-T', container].concat(args), options);
};
exports.run = run;
const buildAll = function (options = {}) {
    return (0, exports.execCompose)('build', options.parallel ? ['--parallel'] : [], options);
};
exports.buildAll = buildAll;
const buildMany = function (services, options = {}) {
    return (0, exports.execCompose)('build', options.parallel ? ['--parallel'].concat(services) : services, options);
};
exports.buildMany = buildMany;
const buildOne = function (service, options) {
    return (0, exports.execCompose)('build', [service], options);
};
exports.buildOne = buildOne;
const createAll = function (options = {}) {
    return (0, exports.execCompose)('create', [], options);
};
exports.createAll = createAll;
const createMany = function (services, options = {}) {
    return (0, exports.execCompose)('create', services, options);
};
exports.createMany = createMany;
const createOne = function (service, options) {
    return (0, exports.execCompose)('create', [service], options);
};
exports.createOne = createOne;
const pullAll = function (options = {}) {
    return (0, exports.execCompose)('pull', [], options);
};
exports.pullAll = pullAll;
const pullMany = function (services, options = {}) {
    return (0, exports.execCompose)('pull', services, options);
};
exports.pullMany = pullMany;
const pullOne = function (service, options) {
    return (0, exports.execCompose)('pull', [service], options);
};
exports.pullOne = pullOne;
const config = async function (options) {
    try {
        const result = await (0, exports.execCompose)('config', [], options);
        const config = yaml_1.default.parse(result.out);
        return {
            ...result,
            data: { config }
        };
    }
    catch (error) {
        return Promise.reject(error);
    }
};
exports.config = config;
const configServices = async function (options) {
    try {
        const result = await (0, exports.execCompose)('config', ['--services'], options);
        const services = result.out.split('\n').filter(nonEmptyString);
        return {
            ...result,
            data: { services }
        };
    }
    catch (error) {
        return Promise.reject(error);
    }
};
exports.configServices = configServices;
const configVolumes = async function (options) {
    try {
        const result = await (0, exports.execCompose)('config', ['--volumes'], options);
        const volumes = result.out.split('\n').filter(nonEmptyString);
        return {
            ...result,
            data: { volumes }
        };
    }
    catch (error) {
        return Promise.reject(error);
    }
};
exports.configVolumes = configVolumes;
const ps = async function (options) {
    try {
        const result = await (0, exports.execCompose)('ps', [], options);
        const data = (0, exports.mapPsOutput)(result.out, options);
        return {
            ...result,
            data
        };
    }
    catch (error) {
        return Promise.reject(error);
    }
};
exports.ps = ps;
const images = async function (options) {
    try {
        const result = await (0, exports.execCompose)('images', [], options);
        const data = (0, exports.mapImListOutput)(result.out, options);
        return {
            ...result,
            data
        };
    }
    catch (error) {
        return Promise.reject(error);
    }
};
exports.images = images;
const push = function (options = {}) {
    return (0, exports.execCompose)('push', options.ignorePushFailures ? ['--ignore-push-failures'] : [], options);
};
exports.push = push;
const restartAll = function (options) {
    return (0, exports.execCompose)('restart', [], options);
};
exports.restartAll = restartAll;
const restartMany = function (services, options) {
    return (0, exports.execCompose)('restart', services, options);
};
exports.restartMany = restartMany;
const restartOne = function (service, options) {
    return (0, exports.restartMany)([service], options);
};
exports.restartOne = restartOne;
const logs = function (services, options = {}) {
    const args = Array.isArray(services) ? services : [services];
    if (options.follow) {
        args.unshift('--follow');
    }
    if (options.timestamps) {
        args.unshift('--timestamps');
    }
    return (0, exports.execCompose)('logs', args, options);
};
exports.logs = logs;
const port = async function (service, containerPort, options) {
    const args = [service, containerPort];
    try {
        const result = await (0, exports.execCompose)('port', args, options);
        const [address, port] = result.out.split(':');
        return {
            ...result,
            data: {
                address,
                port: Number(port)
            }
        };
    }
    catch (error) {
        return Promise.reject(error);
    }
};
exports.port = port;
const version = async function (options) {
    try {
        const result = await (0, exports.execCompose)('version', ['--short'], options);
        const version = result.out.replace('\n', '').trim();
        return {
            ...result,
            data: { version }
        };
    }
    catch (error) {
        return Promise.reject(error);
    }
};
exports.version = version;
const stats = async function (service, options) {
    const args = ['--no-stream', '--format', '"{{ json . }}"', service];
    try {
        const result = await (0, exports.execCompose)('stats', args, options);
        // Remove first and last quote from output, as well as newline.
        const output = result.out.replace('\n', '').trim().slice(1, -1);
        return JSON.parse(output);
    }
    catch (error) {
        return Promise.reject(error);
    }
};
exports.stats = stats;
exports.default = {
    upAll: exports.upAll,
    upMany: exports.upMany,
    upOne: exports.upOne,
    down: exports.down,
    downAll: exports.downAll,
    downOne: exports.downOne,
    downMany: exports.downMany,
    stop: exports.stop,
    stopOne: exports.stopOne,
    stopMany: exports.stopMany,
    pauseOne: exports.pauseOne,
    unpauseOne: exports.unpauseOne,
    kill: exports.kill,
    rm: exports.rm,
    exec: exports.exec,
    run: exports.run,
    buildAll: exports.buildAll,
    buildMany: exports.buildMany,
    buildOne: exports.buildOne,
    pullAll: exports.pullAll,
    pullMany: exports.pullMany,
    pullOne: exports.pullOne,
    config: exports.config,
    configServices: exports.configServices,
    configVolumes: exports.configVolumes,
    ps: exports.ps,
    push: exports.push,
    restartAll: exports.restartAll,
    restartMany: exports.restartMany,
    restartOne: exports.restartOne,
    logs: exports.logs,
    port: exports.port,
    version: exports.version,
    stats: exports.stats
};
