import { stableHash } from 'stable-hash-x';
import { globSync, isDynamicPattern } from 'tinyglobby';
import { DEFAULT_CONFIGS, DEFAULT_IGNORE, DEFAULT_TRY_PATHS, defaultConditionNames, defaultExtensionAlias, defaultExtensions, defaultMainFields, } from './constants.js';
import { toGlobPath, toNativePath, tryFile } from './helpers.js';
import { log } from './logger.js';
export let defaultConfigFile;
const configFileMapping = new Map();
let warned;
export function normalizeOptions(options, cwd = process.cwd()) {
    let { project, tsconfig, noWarnOnMultipleProjects } = (options ||= {});
    let { configFile, references } = tsconfig ?? {};
    let ensured;
    if (configFile) {
        configFile = tryFile(configFile);
        ensured = true;
    }
    else if (project) {
        project = Array.isArray(project) ? project : [project];
        log('original projects:', ...project);
        project = project.map(toGlobPath);
        if (project.some(p => isDynamicPattern(p))) {
            project = globSync(project, {
                absolute: true,
                cwd,
                dot: true,
                expandDirectories: false,
                onlyFiles: false,
                ignore: DEFAULT_IGNORE,
            });
        }
        log('resolving projects:', ...project);
        project = project.flatMap(p => tryFile(DEFAULT_TRY_PATHS, false, toNativePath(p)) || []);
        log('resolved projects:', ...project);
        if (project.length === 1) {
            configFile = project[0];
            ensured = true;
        }
        if (project.length <= 1) {
            project = undefined;
        }
        else if (!warned && !noWarnOnMultipleProjects) {
            warned = true;
            console.warn('Multiple projects found, consider using a single `tsconfig` with `references` to speed up, or use `noWarnOnMultipleProjects` to suppress this warning');
        }
    }
    if (!project && !configFile) {
        configFile = defaultConfigFile ||= tryFile(DEFAULT_CONFIGS);
        ensured = true;
    }
    const optionsHash = stableHash(options);
    const cacheKey = `${configFile}\0${optionsHash}`;
    if (configFile) {
        const cachedOptions = configFileMapping.get(cacheKey);
        if (cachedOptions) {
            log('using cached options for', configFile, 'with options', options);
            return cachedOptions;
        }
    }
    if (!ensured && configFile && configFile !== defaultConfigFile) {
        configFile = tryFile(DEFAULT_TRY_PATHS, false, configFile);
    }
    options = {
        conditionNames: defaultConditionNames,
        extensions: defaultExtensions,
        extensionAlias: defaultExtensionAlias,
        mainFields: defaultMainFields,
        ...options,
        project,
        tsconfig: configFile
            ? { references: references ?? 'auto', configFile: configFile }
            : undefined,
    };
    if (configFile) {
        configFileMapping.set(cacheKey, options);
    }
    return options;
}
//# sourceMappingURL=normalize-options.js.map