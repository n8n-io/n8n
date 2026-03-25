"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.all = all;
exports.filter = filter;
exports.sort = sort;
exports.run = run;
/**
 * Returns the given plugins as an array, rather than an object map.
 * All other methods in this module expect an array of plugins rather than an object map.
 *
 * @returns
 */
function all(plugins) {
    return Object.keys(plugins || {})
        .filter((key) => {
        return typeof plugins[key] === "object";
    })
        .map((key) => {
        plugins[key].name = key;
        return plugins[key];
    });
}
/**
 * Filters the given plugins, returning only the ones return `true` for the given method.
 */
function filter(plugins, method, file) {
    return plugins.filter((plugin) => {
        return !!getResult(plugin, method, file);
    });
}
/**
 * Sorts the given plugins, in place, by their `order` property.
 */
function sort(plugins) {
    for (const plugin of plugins) {
        plugin.order = plugin.order || Number.MAX_SAFE_INTEGER;
    }
    return plugins.sort((a, b) => {
        return a.order - b.order;
    });
}
/**
 * Runs the specified method of the given plugins, in order, until one of them returns a successful result.
 * Each method can return a synchronous value, a Promise, or call an error-first callback.
 * If the promise resolves successfully, or the callback is called without an error, then the result
 * is immediately returned and no further plugins are called.
 * If the promise rejects, or the callback is called with an error, then the next plugin is called.
 * If ALL plugins fail, then the last error is thrown.
 */
async function run(plugins, method, file, $refs) {
    let plugin;
    let lastError;
    let index = 0;
    return new Promise((resolve, reject) => {
        runNextPlugin();
        function runNextPlugin() {
            plugin = plugins[index++];
            if (!plugin) {
                // There are no more functions, so re-throw the last error
                return reject(lastError);
            }
            try {
                // console.log('  %s', plugin.name);
                const result = getResult(plugin, method, file, callback, $refs);
                if (result && typeof result.then === "function") {
                    // A promise was returned
                    result.then(onSuccess, onError);
                }
                else if (result !== undefined) {
                    // A synchronous result was returned
                    onSuccess(result);
                }
                else if (index === plugins.length) {
                    throw new Error("No promise has been returned or callback has been called.");
                }
            }
            catch (e) {
                onError(e);
            }
        }
        function callback(err, result) {
            if (err) {
                onError(err);
            }
            else {
                onSuccess(result);
            }
        }
        function onSuccess(result) {
            // console.log('    success');
            resolve({
                plugin,
                result,
            });
        }
        function onError(error) {
            // console.log('    %s', err.message || err);
            lastError = {
                plugin,
                error,
            };
            runNextPlugin();
        }
    });
}
/**
 * Returns the value of the given property.
 * If the property is a function, then the result of the function is returned.
 * If the value is a RegExp, then it will be tested against the file URL.
 * If the value is an array, then it will be compared against the file extension.
 */
function getResult(obj, prop, file, callback, $refs) {
    const value = obj[prop];
    if (typeof value === "function") {
        return value.apply(obj, [file, callback, $refs]);
    }
    if (!callback) {
        // The synchronous plugin functions (canParse and canRead)
        // allow a "shorthand" syntax, where the user can match
        // files by RegExp or by file extension.
        if (value instanceof RegExp) {
            return value.test(file.url);
        }
        else if (typeof value === "string") {
            return value === file.extension;
        }
        else if (Array.isArray(value)) {
            return value.indexOf(file.extension) !== -1;
        }
    }
    return value;
}
