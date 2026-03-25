/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as path from 'path';
import { types as utilTypes } from 'util';
import { satisfies } from '../../semver';
import { wrap, unwrap } from '../../shimmer';
import { InstrumentationAbstract } from '../../instrumentation';
import { RequireInTheMiddleSingleton, } from './RequireInTheMiddleSingleton';
import { Hook as HookImport } from 'import-in-the-middle';
import { diag } from '@opentelemetry/api';
import { Hook as HookRequire } from 'require-in-the-middle';
import { readFileSync } from 'fs';
import { isWrapped } from '../../utils';
/**
 * Base abstract class for instrumenting node plugins
 */
export class InstrumentationBase extends InstrumentationAbstract {
    _modules;
    _hooks = [];
    _requireInTheMiddleSingleton = RequireInTheMiddleSingleton.getInstance();
    _enabled = false;
    constructor(instrumentationName, instrumentationVersion, config) {
        super(instrumentationName, instrumentationVersion, config);
        let modules = this.init();
        if (modules && !Array.isArray(modules)) {
            modules = [modules];
        }
        this._modules = modules || [];
        if (this._config.enabled) {
            this.enable();
        }
    }
    _wrap = (moduleExports, name, wrapper) => {
        if (isWrapped(moduleExports[name])) {
            this._unwrap(moduleExports, name);
        }
        if (!utilTypes.isProxy(moduleExports)) {
            return wrap(moduleExports, name, wrapper);
        }
        else {
            const wrapped = wrap(Object.assign({}, moduleExports), name, wrapper);
            Object.defineProperty(moduleExports, name, {
                value: wrapped,
            });
            return wrapped;
        }
    };
    _unwrap = (moduleExports, name) => {
        if (!utilTypes.isProxy(moduleExports)) {
            return unwrap(moduleExports, name);
        }
        else {
            return Object.defineProperty(moduleExports, name, {
                value: moduleExports[name],
            });
        }
    };
    _massWrap = (moduleExportsArray, names, wrapper) => {
        if (!moduleExportsArray) {
            diag.error('must provide one or more modules to patch');
            return;
        }
        else if (!Array.isArray(moduleExportsArray)) {
            moduleExportsArray = [moduleExportsArray];
        }
        if (!(names && Array.isArray(names))) {
            diag.error('must provide one or more functions to wrap on modules');
            return;
        }
        moduleExportsArray.forEach(moduleExports => {
            names.forEach(name => {
                this._wrap(moduleExports, name, wrapper);
            });
        });
    };
    _massUnwrap = (moduleExportsArray, names) => {
        if (!moduleExportsArray) {
            diag.error('must provide one or more modules to patch');
            return;
        }
        else if (!Array.isArray(moduleExportsArray)) {
            moduleExportsArray = [moduleExportsArray];
        }
        if (!(names && Array.isArray(names))) {
            diag.error('must provide one or more functions to wrap on modules');
            return;
        }
        moduleExportsArray.forEach(moduleExports => {
            names.forEach(name => {
                this._unwrap(moduleExports, name);
            });
        });
    };
    _warnOnPreloadedModules() {
        this._modules.forEach((module) => {
            const { name } = module;
            try {
                const resolvedModule = require.resolve(name);
                if (require.cache[resolvedModule]) {
                    // Module is already cached, which means the instrumentation hook might not work
                    this._diag.warn(`Module ${name} has been loaded before ${this.instrumentationName} so it might not work, please initialize it before requiring ${name}`);
                }
            }
            catch {
                // Module isn't available, we can simply skip
            }
        });
    }
    _extractPackageVersion(baseDir) {
        try {
            const json = readFileSync(path.join(baseDir, 'package.json'), {
                encoding: 'utf8',
            });
            const version = JSON.parse(json).version;
            return typeof version === 'string' ? version : undefined;
        }
        catch {
            diag.warn('Failed extracting version', baseDir);
        }
        return undefined;
    }
    _onRequire(module, exports, name, baseDir) {
        if (!baseDir) {
            if (typeof module.patch === 'function') {
                module.moduleExports = exports;
                if (this._enabled) {
                    this._diag.debug('Applying instrumentation patch for nodejs core module on require hook', {
                        module: module.name,
                    });
                    return module.patch(exports);
                }
            }
            return exports;
        }
        const version = this._extractPackageVersion(baseDir);
        module.moduleVersion = version;
        if (module.name === name) {
            // main module
            if (isSupported(module.supportedVersions, version, module.includePrerelease)) {
                if (typeof module.patch === 'function') {
                    module.moduleExports = exports;
                    if (this._enabled) {
                        this._diag.debug('Applying instrumentation patch for module on require hook', {
                            module: module.name,
                            version: module.moduleVersion,
                            baseDir,
                        });
                        return module.patch(exports, module.moduleVersion);
                    }
                }
            }
            return exports;
        }
        // internal file
        const files = module.files ?? [];
        const normalizedName = path.normalize(name);
        const supportedFileInstrumentations = files
            .filter(f => f.name === normalizedName)
            .filter(f => isSupported(f.supportedVersions, version, module.includePrerelease));
        return supportedFileInstrumentations.reduce((patchedExports, file) => {
            file.moduleExports = patchedExports;
            if (this._enabled) {
                this._diag.debug('Applying instrumentation patch for nodejs module file on require hook', {
                    module: module.name,
                    version: module.moduleVersion,
                    fileName: file.name,
                    baseDir,
                });
                // patch signature is not typed, so we cast it assuming it's correct
                return file.patch(patchedExports, module.moduleVersion);
            }
            return patchedExports;
        }, exports);
    }
    enable() {
        if (this._enabled) {
            return;
        }
        this._enabled = true;
        // already hooked, just call patch again
        if (this._hooks.length > 0) {
            for (const module of this._modules) {
                if (typeof module.patch === 'function' && module.moduleExports) {
                    this._diag.debug('Applying instrumentation patch for nodejs module on instrumentation enabled', {
                        module: module.name,
                        version: module.moduleVersion,
                    });
                    module.patch(module.moduleExports, module.moduleVersion);
                }
                for (const file of module.files) {
                    if (file.moduleExports) {
                        this._diag.debug('Applying instrumentation patch for nodejs module file on instrumentation enabled', {
                            module: module.name,
                            version: module.moduleVersion,
                            fileName: file.name,
                        });
                        file.patch(file.moduleExports, module.moduleVersion);
                    }
                }
            }
            return;
        }
        this._warnOnPreloadedModules();
        for (const module of this._modules) {
            const hookFn = (exports, name, baseDir) => {
                if (!baseDir && path.isAbsolute(name)) {
                    const parsedPath = path.parse(name);
                    name = parsedPath.name;
                    baseDir = parsedPath.dir;
                }
                return this._onRequire(module, exports, name, baseDir);
            };
            const onRequire = (exports, name, baseDir) => {
                return this._onRequire(module, exports, name, baseDir);
            };
            // `RequireInTheMiddleSingleton` does not support absolute paths.
            // For an absolute paths, we must create a separate instance of the
            // require-in-the-middle `Hook`.
            const hook = path.isAbsolute(module.name)
                ? new HookRequire([module.name], { internals: true }, onRequire)
                : this._requireInTheMiddleSingleton.register(module.name, onRequire);
            this._hooks.push(hook);
            const esmHook = new HookImport([module.name], { internals: false }, hookFn);
            this._hooks.push(esmHook);
        }
    }
    disable() {
        if (!this._enabled) {
            return;
        }
        this._enabled = false;
        for (const module of this._modules) {
            if (typeof module.unpatch === 'function' && module.moduleExports) {
                this._diag.debug('Removing instrumentation patch for nodejs module on instrumentation disabled', {
                    module: module.name,
                    version: module.moduleVersion,
                });
                module.unpatch(module.moduleExports, module.moduleVersion);
            }
            for (const file of module.files) {
                if (file.moduleExports) {
                    this._diag.debug('Removing instrumentation patch for nodejs module file on instrumentation disabled', {
                        module: module.name,
                        version: module.moduleVersion,
                        fileName: file.name,
                    });
                    file.unpatch(file.moduleExports, module.moduleVersion);
                }
            }
        }
    }
    isEnabled() {
        return this._enabled;
    }
}
function isSupported(supportedVersions, version, includePrerelease) {
    if (typeof version === 'undefined') {
        // If we don't have the version, accept the wildcard case only
        return supportedVersions.includes('*');
    }
    return supportedVersions.some(supportedVersion => {
        return satisfies(version, supportedVersion, { includePrerelease });
    });
}
//# sourceMappingURL=instrumentation.js.map