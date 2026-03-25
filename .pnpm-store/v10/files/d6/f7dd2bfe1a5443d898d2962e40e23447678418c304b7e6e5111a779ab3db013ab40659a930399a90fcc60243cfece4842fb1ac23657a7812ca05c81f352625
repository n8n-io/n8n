/*
Copyright (c) 2013, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/

var UNKNOWN = 'UNKNOWN';
var UNLICENSED = 'UNLICENSED';
var fs = require('fs');
var path = require('path');
var read = require('read-installed');
var chalk = require('chalk');
var treeify = require('treeify');
var license = require('./license');
var licenseFiles = require('./license-files');
var debug = require('debug');
var mkdirp = require('mkdirp');
var spdxSatisfies = require('spdx-satisfies');
var spdxCorrect =require('spdx-correct');

// Set up debug logging
// https://www.npmjs.com/package/debug#stderr-vs-stdout
var debugError = debug('license-checker:error');
var debugLog = debug('license-checker:log');
debugLog.log = console.log.bind(console);

var flatten = function(options) {
    var moduleInfo = { licenses: UNKNOWN },
        json = options.deps,
        data = options.data,
        key = json.name + '@' + json.version,
        colorize = options.color,
        unknown = options.unknown,
        readmeFile,
        licenseData, dirFiles, files = [], noticeFiles = [], licenseFile;

    if (json.private) {
        moduleInfo.private = true;
    }

    // If we have processed this key already, just return the data object.
    // This was added so that we don't recurse forever if there was a circular
    // dependency in the dependency tree.
    /*istanbul ignore next*/
    if (data[key]) {
        return data;
    }

    if ((options.production && json.extraneous) || (options.development && !json.extraneous && !json.root)) {
        return data;
    }

    data[key] = moduleInfo;

    // Include property in output unless custom format has set property to false.
    var include = function(property) {
        return (options.customFormat === undefined || options.customFormat[property] !== false);
    };

    if (include("repository") && json.repository) {
        /*istanbul ignore else*/
        if (typeof json.repository === 'object' && typeof json.repository.url === 'string') {
            moduleInfo.repository = json.repository.url.replace('git+ssh://git@', 'git://');
            moduleInfo.repository = moduleInfo.repository.replace('git+https://github.com', 'https://github.com');
            moduleInfo.repository = moduleInfo.repository.replace('git://github.com', 'https://github.com');
            moduleInfo.repository = moduleInfo.repository.replace('git@github.com:', 'https://github.com/');
            moduleInfo.repository = moduleInfo.repository.replace(/\.git$/, '');
        }
    }
    if (include("url") && json.url) {
        /*istanbul ignore next*/
        if (typeof json.url === 'object') {
            moduleInfo.url = json.url.web;
        }
    }
    if (json.author && typeof json.author === 'object') {
        /*istanbul ignore else - This should always be there*/
        if (include("publisher") && json.author.name) {
            moduleInfo.publisher = json.author.name;
        }
        if (include("email") && json.author.email) {
            moduleInfo.email = json.author.email;
        }
        if (include("url") && json.author.url) {
            moduleInfo.url = json.author.url;
        }
    }

    /*istanbul ignore next*/
    if (unknown) {
        moduleInfo.dependencyPath = json.path;
    }

    /*istanbul ignore next*/
    if (options.customFormat) {
        Object.keys(options.customFormat).forEach(function forEachCallback(item) {
            if (include(item) && json[item]) {
                //For now, we only support strings, not JSON objects
                if (typeof json[item] === 'string') {
                    moduleInfo[item] = json[item];
                }
            } else if (include(item)) {
                moduleInfo[item] = options.customFormat[item];
            }
        });
    }

    if (include("path") && json.path && typeof json.path === 'string') {
        moduleInfo.path = json.path;
    }

    licenseData = json.license || json.licenses || undefined;

    if (json.path && (!json.readme || json.readme.toLowerCase().indexOf('no readme data found') > -1)) {
        readmeFile = path.join(json.path, 'README.md');
        /*istanbul ignore if*/
        if (fs.existsSync(readmeFile)) {
            json.readme = fs.readFileSync(readmeFile, 'utf8').toString();
        }
    }

    if (licenseData) {
        /*istanbul ignore else*/
        if (Array.isArray(licenseData) && licenseData.length > 0) {
            moduleInfo.licenses = licenseData.map(function(license){
                /*istanbul ignore else*/
                if (typeof license === 'object') {
                    /*istanbul ignore next*/
                    return license.type || license.name;
                } else if (typeof license === 'string') {
                    return license;
                }
            });
        } else if (typeof licenseData === 'object' && (licenseData.type || licenseData.name)) {
            moduleInfo.licenses = license(licenseData.type || licenseData.name);
        } else if (typeof licenseData === 'string') {
            moduleInfo.licenses = license(licenseData);
        }
    } else if (license(json.readme)) {
        moduleInfo.licenses = license(json.readme);
    }

    if (Array.isArray(moduleInfo.licenses)) {
        /*istanbul ignore else*/
        if (moduleInfo.licenses.length === 1) {
            moduleInfo.licenses = moduleInfo.licenses[0];
        }
    }

    /*istanbul ignore else*/
    if (json.path && fs.existsSync(json.path)) {
        dirFiles = fs.readdirSync(json.path);
        files = licenseFiles(dirFiles);

        noticeFiles = dirFiles.filter(function(filename) {
            filename = filename.toUpperCase();
            var name = path.basename(filename).replace(path.extname(filename), '');
            return name === 'NOTICE';
        });
    }

    files.forEach(function(filename, index) {
        licenseFile = path.join(json.path, filename);
        // Checking that the file is in fact a normal file and not a directory for example.
        /*istanbul ignore else*/
        if (fs.lstatSync(licenseFile).isFile()) {
            var content;
            if (!moduleInfo.licenses || moduleInfo.licenses.indexOf(UNKNOWN) > -1 || moduleInfo.licenses.indexOf('Custom:') === 0) {
                //Only re-check the license if we didn't get it from elsewhere
                content = fs.readFileSync(licenseFile, { encoding: 'utf8' });
                moduleInfo.licenses = license(content);
            }

            if (index === 0) {
                // Treat the file with the highest precedence as licenseFile
                /*istanbul ignore else*/
                if (include("licenseFile")) {
                    moduleInfo.licenseFile = options.basePath ? path.relative(options.basePath, licenseFile) : licenseFile;
                }

                if (include("licenseText") && options.customFormat) {
                    if (!content) {
                        content = fs.readFileSync(licenseFile, { encoding: 'utf8' });
                    }
                    /*istanbul ignore else*/
                    if (options._args && !options._args.csv) {
                        moduleInfo.licenseText = content.trim();
                    } else {
                        moduleInfo.licenseText = content.replace(/"/g, '\'').replace(/\r?\n|\r/g, " ").trim();
                    }
                }

                if(include('copyright') && options.customFormat) {
                    if (!content) {
                        content = fs.readFileSync(licenseFile, { encoding: 'utf8' });
                    }

                    var linesWithCopyright = content
                        .replace(/\r\n/g, '\n')
                        .split('\n\n')
                        .filter(function selectCopyRightStatements(value) {
                            return value.startsWith('opyright', 1) &&         // include copyright statements
                                !value.startsWith('opyright notice', 1) &&    // exclude lines from from license text
                                !value.startsWith('opyright and related rights', 1);
                        })
                        .filter(function removeDuplicates(value, index, list) {
                            return index === 0 || value !== list[0];
                        });

                    if(linesWithCopyright.length > 0) {
                        moduleInfo.copyright = linesWithCopyright[0]
                            .replace(/\n/g, '. ')
                            .trim();
                    }
                
                    // Mark files with multiple copyright statements. This might be
                    // an indicator to take a closer look at the LICENSE file.
                    if(linesWithCopyright.length > 1) {
                        moduleInfo.copyright += '*';
                    }
                }
            }
        }
    });

    noticeFiles.forEach(function(filename) {
        var file = path.join(json.path, filename);
        /*istanbul ignore else*/
        if (fs.lstatSync(file).isFile()) {
            moduleInfo.noticeFile = options.basePath ? path.relative(options.basePath, file) : file;
        }
    });

    /*istanbul ignore else*/
    if (json.dependencies) {
        Object.keys(json.dependencies).forEach(function(name) {
            var childDependency = json.dependencies[name],
                dependencyId = childDependency.name + '@' + childDependency.version;
            if (data[dependencyId]) { // already exists
                return;
            }
            data = flatten({
                deps: childDependency,
                data: data,
                color: colorize,
                unknown: unknown,
                customFormat: options.customFormat,
                production: options.production,
                development: options.development,
                basePath: options.basePath,
                _args: options._args
            });
        });
    }
    if (!json.name || !json.version) {
        delete data[key];
    }
    return data;
};

exports.init = function(options, callback) {
    debugLog('scanning %s', options.start);

    if (options.customPath) {
        options.customFormat = this.parseJson(options.customPath);
    }
    var opts = {
        dev: true,
        log: debugLog,
        depth: options.direct
    };

    if (options.production || options.development) {
        opts.dev = false;
    }

    var toCheckforFailOn = [];
    var toCheckforOnlyAllow = [];
    var checker, pusher;
    if (options.onlyAllow) {
        checker = options.onlyAllow;
        pusher = toCheckforOnlyAllow;
    }
    if (options.failOn) {
        checker = options.failOn;
        pusher = toCheckforFailOn;
    }
    if (checker && pusher) {
        checker.split(';').forEach(function(license) {
            var trimmed = license.trim();
            /*istanbul ignore else*/
            if (trimmed.length > 0) {
                pusher.push(trimmed);
            }
        });
    }

    read(options.start, opts, function(err, json) {
        var data = flatten({
                deps: json,
                data: {},
                color: options.color,
                unknown: options.unknown,
                customFormat: options.customFormat,
                production: options.production,
                development: options.development,
                basePath: options.relativeLicensePath ? json.path : null,
                _args: options
            }),
            colorize = options.color,
            sorted = {},
            filtered = {},
            exclude = options.exclude && options.exclude.match(/([^\\\][^,]|\\,)+/g).map(function(license) {
                return license.replace(/\\,/g, ',').replace(/^\s+|\s+$/g, '');
            }),
            inputError = null;

        var colorizeString = function(string) {
            /*istanbul ignore next*/
            return colorize ? chalk.bold.red(string) : string;
        };

        Object.keys(data).sort().forEach(function(item) {
            if (data[item].private) {
                data[item].licenses = colorizeString(UNLICENSED);
            }
            /*istanbul ignore next*/
            if (!data[item].licenses) {
                data[item].licenses = colorizeString(UNKNOWN);
            }
            if (options.unknown) {
                /*istanbul ignore else*/
                if (data[item].licenses && data[item].licenses !== UNKNOWN) {
                    if (data[item].licenses.indexOf('*') > -1) {
                        /*istanbul ignore if*/
                        data[item].licenses = colorizeString(UNKNOWN);
                    }
                }
            }
            /*istanbul ignore else*/
            if (data[item]) {
                if (options.onlyunknown) {
                    if (data[item].licenses.indexOf('*') > -1 ||
                        data[item].licenses.indexOf(UNKNOWN) > -1) {
                        sorted[item] = data[item];
                    }
                } else {
                    sorted[item] = data[item];
                }
            }
        });

        if (!Object.keys(sorted).length) {
            err = new Error('No packages found in this path..');
        }

        if (exclude) {
            var transformBSD = function(spdx) {
                return spdx === 'BSD' ? '(0BSD OR BSD-2-Clause OR BSD-3-Clause OR BSD-4-Clause)' : spdx;
            };
            var invert = function(fn) { return function(spdx) { return !fn(spdx);};};
            var spdxIsValid = function(spdx) { return spdxCorrect(spdx) === spdx; };

            var validSPDXLicenses = exclude.map(transformBSD).filter(spdxIsValid);
            var invalidSPDXLicenses = exclude.map(transformBSD).filter(invert(spdxIsValid));
            var spdxExcluder = '( ' + validSPDXLicenses.join(' OR ') + ' )';

            Object.keys(sorted).forEach(function(item) {
                var licenses = sorted[item].licenses;
                /*istanbul ignore if - just for protection*/
                if(!licenses) {
                    filtered[item] = sorted[item];
                } else {
                    licenses = [].concat(licenses);
                    var licenseMatch = false;
                    licenses.forEach(function(license) {
                        /*istanbul ignore if - just for protection*/
                        if (license.indexOf(UNKNOWN) >= 0) { // necessary due to colorization
                            filtered[item] = sorted[item];
                        } else {
                            if(license.indexOf('*') >= 0) {
                                license = license.substring(0, license.length - 1);
                            }
                            if(license === 'BSD') {
                                license = '(0BSD OR BSD-2-Clause OR BSD-3-Clause OR BSD-4-Clause)';
                            }

                            if (invalidSPDXLicenses.indexOf(license) >= 0) {
                                licenseMatch = true;
                            } else if (spdxCorrect(license) && spdxSatisfies(spdxCorrect(license), spdxExcluder)) {
                                licenseMatch = true;
                            }
                        }
                    });
                    if(!licenseMatch) {
                        filtered[item] = sorted[item];
                    }
                }
            });
        } else {
            filtered = sorted;
        }

        var restricted = filtered;

        // package whitelist
        if (options.packages) {
            var packages = options.packages.split(';');
            restricted = {};
            Object.keys(filtered).map(function(key) {
                if (packages.includes(key)) {
                    restricted[key] = filtered[key];
                }
            });
        }

        // package blacklist
        if (options.excludePackages) {
            var excludedPackages = options.excludePackages.split(';');
            restricted = {};
            Object.keys(filtered).map(function(key) {
                if (!excludedPackages.includes(key)) {
                    restricted[key] = filtered[key];
                }
            });
        }

        if (options.excludePrivatePackages) {
            Object.keys(filtered).forEach(function(key) {
                /*istanbul ignore next - I don't have access to private packages to test */
                if (restricted[key] && restricted[key].private) {
                    delete restricted[key];
                }
            });
        }

        Object.keys(restricted).forEach(function(item) {
            if (toCheckforFailOn.length > 0) {
                if (toCheckforFailOn.indexOf(restricted[item].licenses) > -1) {
                    console.error('Found license defined by the --failOn flag: "' + restricted[item].licenses + '". Exiting.');
                    process.exit(1);
                }
            }
            if (toCheckforOnlyAllow.length > 0) {
                var good = false;
                toCheckforOnlyAllow.forEach(function(k) {
                    if (restricted[item].licenses.indexOf(k) === -1 && !good) {
                        good = false;
                    } else {
                        good = true;
                    }
                });
                if (!good) {
                    console.error('Package "' + item + '" is licensed under "' + restricted[item].licenses + '" which is not permitted by the --onlyAllow flag. Exiting.');
                    process.exit(1);
                }
            }
        });

        /*istanbul ignore next*/
        if (err) {
            debugError(err);
            inputError = err;
        }

        //Return the callback and variables nicely
        callback(inputError, restricted);
    });
};

exports.print = function(sorted) {
    console.log(exports.asTree(sorted));
};

exports.asTree = function(sorted) {
    return treeify.asTree(sorted, true);
};

exports.asSummary = function(sorted) {
    var licenseCountObj = {};
    var licenceCountArray = [];
    var sortedLicenseCountObj = {};

    Object.keys(sorted).forEach(function(key) {
        /*istanbul ignore else*/
        if (sorted[key].licenses) {
            licenseCountObj[sorted[key].licenses] = licenseCountObj[sorted[key].licenses] || 0;
            licenseCountObj[sorted[key].licenses]++;
        }
    });

    Object.keys(licenseCountObj).forEach(function(license) {
        licenceCountArray.push({ license: license, count: licenseCountObj[license] });
    });

    /*istanbul ignore next*/
    licenceCountArray.sort(function(a, b) {
        return b['count'] - a['count'];
    });

    licenceCountArray.forEach(function(licenseObj) {
        sortedLicenseCountObj[licenseObj.license] = licenseObj.count;
    });

    return treeify.asTree(sortedLicenseCountObj, true);
};

exports.asCSV = function(sorted, customFormat, csvComponentPrefix) {
    var text = [], textArr = [], lineArr = [];
    var prefixName = '"component"';
    var prefix = csvComponentPrefix;

    if (customFormat && Object.keys(customFormat).length > 0) {
        textArr = [];
        if (csvComponentPrefix) { textArr.push(prefixName); }
        textArr.push('"module name"');
        Object.keys(customFormat).forEach(function forEachCallback(item) {
            textArr.push('"' + item + '"');
        });
        text.push(textArr.join(','));
    } else {
        textArr = [];
        /*istanbul ignore next*/
        if (csvComponentPrefix) { textArr.push(prefixName); }
        ['"module name"','"license"','"repository"'].forEach(function(item) {
            textArr.push(item);
        });
        text.push(textArr.join(','));
    }

    Object.keys(sorted).forEach(function(key) {
        var module = sorted[key],
            line = '';
        lineArr = [];

        //Grab the custom keys from the custom format
        if (customFormat && Object.keys(customFormat).length > 0) {
            if (csvComponentPrefix) {
                lineArr.push('"'+prefix+'"');
            }
            lineArr.push('"' + key + '"');
            Object.keys(customFormat).forEach(function forEachCallback(item) {
                lineArr.push('"' + module[item] + '"');
            });
            line = lineArr.join(',');
        } else {
            /*istanbul ignore next*/
            if (csvComponentPrefix) {
                lineArr.push('"'+prefix+'"');
            }
            lineArr.push([
                '"' + key + '"',
                '"' + (module.licenses || '') + '"',
                '"' + (module.repository || '') + '"'
            ]);
            line = lineArr.join(',');
        }
        text.push(line);
    });

    return text.join('\n');
};

/**
* Exports data as markdown (*.md) file which has it's own syntax.
* @method
* @param  {JSON} sorted       The sorted JSON data from all packages.
* @param  {JSON} customFormat The custom format with information about the needed keys.
* @return {String}            The returning plain text.
*/
exports.asMarkDown = function(sorted, customFormat) {

    var text = [];
    if (customFormat && Object.keys(customFormat).length > 0) {
        Object.keys(sorted).forEach(function sortedCallback(sortedItem) {
            text.push(' - **[' + sortedItem + '](' + sorted[sortedItem].repository + ')**');
            Object.keys(customFormat).forEach(function customCallback(customItem) {
                text.push('    - ' +  customItem + ': ' + sorted[sortedItem][customItem]);
            });
        });
        text = text.join('\n');
    } else {
        Object.keys(sorted).forEach(function(key) {
            var module = sorted[key];
            text.push('[' + key + '](' + module.repository + ') - ' + module.licenses);
        });
        text = text.join('\n');
    }

    return text;
};

exports.parseJson = function(jsonPath) {
    if (typeof jsonPath !== 'string') {
        return new Error('did not specify a path');
    }

    var jsonFileContents = '',
        result = { };

    try {
        jsonFileContents = fs.readFileSync(jsonPath, { encoding: 'utf8' });
        result = JSON.parse(jsonFileContents);
    } catch (err) {
        result = err;
    }
    return result;
};

exports.asFiles = function(json, outDir) {
    mkdirp.sync(outDir);
    Object.keys(json).forEach(function(moduleName) {
        var licenseFile = json[moduleName].licenseFile,
            fileContents, outFileName, outPath, baseDir;

        if (licenseFile && fs.existsSync(licenseFile)) {
            fileContents = fs.readFileSync(licenseFile);
            outFileName = moduleName + "-LICENSE.txt";
            outPath = path.join(outDir, outFileName);
            baseDir = path.dirname(outPath);
            mkdirp.sync(baseDir);
            fs.writeFileSync(outPath, fileContents, "utf8");
        } else {
            console.warn("no license file found for: " + moduleName);
        }
    });
};
