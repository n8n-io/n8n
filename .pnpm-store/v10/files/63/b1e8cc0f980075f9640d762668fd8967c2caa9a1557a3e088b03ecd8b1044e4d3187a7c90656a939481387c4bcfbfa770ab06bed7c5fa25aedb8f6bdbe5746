"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionCheckers = void 0;
var semver_1 = require("semver");
var get_package_version_1 = require("./get-package-version");
var logger_1 = require("./logger");
var messages_1 = require("./messages");
var logger = logger_1.rootLogger.child({ namespace: 'versions' });
/**
 * @internal
 */
exports.VersionCheckers = {
    jest: createVersionChecker('jest', ">=29.0.0 <30" /* ExpectedVersions.Jest */),
    typescript: createVersionChecker('typescript', ">=4.3 <6" /* ExpectedVersions.TypeScript */),
    babelJest: createVersionChecker('babel-jest', ">=29.0.0 <30" /* ExpectedVersions.BabelJest */),
    babelCore: createVersionChecker('@babel/core', ">=7.0.0-beta.0 <8" /* ExpectedVersions.BabelCore */),
};
function checkVersion(name, expectedRange, action) {
    if (action === void 0) { action = 'warn'; }
    var success = true;
    if (!('TS_JEST_DISABLE_VER_CHECKER' in process.env)) {
        var version = (0, get_package_version_1.getPackageVersion)(name);
        success = !!version && (0, semver_1.satisfies)(version, expectedRange);
        logger.debug({
            actualVersion: version,
            expectedVersion: expectedRange,
        }, 'checking version of %s: %s', name, success ? 'OK' : 'NOT OK');
        if (!action || success)
            return success;
        var message = (0, messages_1.interpolate)(version ? "Version {{actualVersion}} of {{module}} installed has not been tested with ts-jest. If you're experiencing issues, consider using a supported version ({{expectedVersion}}). Please do not report issues in ts-jest if you are using unsupported versions." /* Errors.UntestedDependencyVersion */ : "Module {{module}} is not installed. If you're experiencing issues, consider installing a supported version ({{expectedVersion}})." /* Errors.MissingDependency */, {
            module: name,
            actualVersion: version || '??',
            expectedVersion: rangeToHumanString(expectedRange),
        });
        if (action === 'warn') {
            logger.warn(message);
        }
        else if (action === 'throw') {
            logger.fatal(message);
            throw new RangeError(message);
        }
    }
    return success;
}
function rangeToHumanString(versionRange) {
    return new semver_1.Range(versionRange).toString();
}
function createVersionChecker(moduleName, expectedVersion) {
    var memo;
    var warn = function () {
        if (memo !== undefined)
            return memo;
        return (memo = checkVersion(moduleName, expectedVersion, 'warn'));
    };
    var raise = function () { return checkVersion(moduleName, expectedVersion, 'throw'); };
    return {
        raise: raise,
        warn: warn,
        forget: function () {
            memo = undefined;
        },
    };
}
