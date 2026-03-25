"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbVersion = exports.initDbVersionProvider = exports.DbVersionProvider = exports.DbVersionSupport = void 0;
const metaGetter_js_1 = __importDefault(require("../misc/metaGetter.js"));
class DbVersionSupport {
    constructor(dbVersionProvider) {
        this.getVersion = () => this.dbVersionProvider.getVersion();
        this.errorMessage = (feature, current, required) => `${feature} is not supported with Weaviate version v${current}. Please use version v${required} or higher.`;
        this.supportsCompatibleGrpcService = () => this.dbVersionProvider.getVersion().then((version) => {
            return {
                version: version,
                supports: version.isAtLeast(1, 27, 0),
                message: this.errorMessage('The gRPC API', version.show(), '1.27.0'),
            };
        });
        this.requiresNamedVectorsInsertFix = () => {
            return this.dbVersionProvider.getVersion().then((version) => {
                return {
                    version: version,
                    supports: (version.isAtLeast(1, 24, 0) && version.isLowerThan(1, 24, 26)) ||
                        (version.isAtLeast(1, 25, 0) && version.isLowerThan(1, 25, 22)) ||
                        (version.isAtLeast(1, 26, 0) && version.isLowerThan(1, 26, 8)) ||
                        (version.isAtLeast(1, 27, 0) && version.isLowerThan(1, 27, 1)),
                    message: this.errorMessage('Named vectors insert fix', version.show(), '1.24.0 <= x < 1.24.26, 1.25.0 <= x < 1.25.22, 1.26.0 <= x < 1.26.8, 1.27.0 <= x < 1.27.1'),
                };
            });
        };
        this.supportsTenantGetRESTMethod = () => this.dbVersionProvider.getVersion().then((version) => ({
            version: version,
            supports: version.isAtLeast(1, 28, 0),
            message: this.errorMessage('Tenant get method over REST', version.show(), '1.28.0'),
        }));
        this.supportsAggregateGRPC = () => {
            return this.dbVersionProvider.getVersion().then((version) => {
                return {
                    version: version,
                    supports: version.isAtLeast(1, 29, 0),
                    message: this.errorMessage('Aggregate gRPC method', version.show(), '1.29.0'),
                };
            });
        };
        this.supportsVectorsFieldInGRPC = () => {
            return this.dbVersionProvider.getVersion().then((version) => {
                return {
                    version: version,
                    supports: version.isAtLeast(1, 29, 0),
                    message: undefined,
                };
            });
        };
        this.supportsSingleGrouped = () => this.dbVersionProvider.getVersion().then((version) => ({
            version,
            supports: (version.isAtLeast(1, 27, 14) && version.isLowerThan(1, 28, 0)) ||
                (version.isAtLeast(1, 28, 8) && version.isLowerThan(1, 29, 0)) ||
                (version.isAtLeast(1, 29, 0) && version.isLowerThan(1, 30, 0)) ||
                version.isAtLeast(1, 30, 0),
            message: this.errorMessage('Single/Grouped fields in gRPC', version.show(), '1.30.0'),
        }));
        this.supportsGenerativeConfigRuntime = () => this.dbVersionProvider.getVersion().then((version) => ({
            version,
            supports: version.isAtLeast(1, 30, 0),
            message: this.errorMessage('Generative config runtime', version.show(), '1.30.0'),
        }));
        this.dbVersionProvider = dbVersionProvider;
    }
    supportsClassNameNamespacedEndpointsPromise() {
        return this.dbVersionProvider
            .getVersion()
            .then((version) => version.show())
            .then((version) => ({
            version: version,
            supports: this.supportsClassNameNamespacedEndpoints(version),
            warns: {
                deprecatedNonClassNameNamespacedEndpointsForObjects: () => console.warn(`Usage of objects paths without className is deprecated in Weaviate ${version}. Please provide className parameter`),
                deprecatedNonClassNameNamespacedEndpointsForReferences: () => console.warn(`Usage of references paths without className is deprecated in Weaviate ${version}. Please provide className parameter`),
                deprecatedNonClassNameNamespacedEndpointsForBeacons: () => console.warn(`Usage of beacons paths without className is deprecated in Weaviate ${version}. Please provide className parameter`),
                deprecatedWeaviateTooOld: () => console.warn(`Usage of weaviate ${version} is deprecated. Please consider upgrading to the latest version. See https://www.weaviate.io/developers/weaviate for details.`),
                notSupportedClassNamespacedEndpointsForObjects: () => console.warn(`Usage of objects paths with className is not supported in Weaviate ${version}. className parameter is ignored`),
                notSupportedClassNamespacedEndpointsForReferences: () => console.warn(`Usage of references paths with className is not supported in Weaviate ${version}. className parameter is ignored`),
                notSupportedClassNamespacedEndpointsForBeacons: () => console.warn(`Usage of beacons paths with className is not supported in Weaviate ${version}. className parameter is ignored`),
                notSupportedClassParameterInEndpointsForObjects: () => console.warn(`Usage of objects paths with class query parameter is not supported in Weaviate ${version}. class query parameter is ignored`),
            },
        }));
    }
    // >= 1.14
    supportsClassNameNamespacedEndpoints(version) {
        if (typeof version === 'string') {
            const versionNumbers = version.split('.');
            if (versionNumbers.length >= 2) {
                const major = parseInt(versionNumbers[0], 10);
                const minor = parseInt(versionNumbers[1], 10);
                return (major == 1 && minor >= 14) || major >= 2;
            }
        }
        return false;
    }
}
exports.DbVersionSupport = DbVersionSupport;
const EMPTY_VERSION = '';
class DbVersionProvider {
    constructor(versionStringGetter) {
        this.versionStringGetter = versionStringGetter;
        this.versionPromise = undefined;
    }
    getVersionString() {
        return this.getVersion().then((version) => version.show());
    }
    getVersion() {
        if (this.versionPromise) {
            return this.versionPromise;
        }
        return this.versionStringGetter().then((version) => this.cache(version));
    }
    refresh(force = false) {
        if (force || !this.versionPromise) {
            this.versionPromise = undefined;
            return this.versionStringGetter()
                .then((version) => this.cache(version))
                .then(() => Promise.resolve(true));
        }
        return Promise.resolve(false);
    }
    cache(version) {
        if (version === EMPTY_VERSION) {
            return Promise.resolve(new DbVersion(0, 0, 0));
        }
        this.versionPromise = Promise.resolve(DbVersion.fromString(version));
        return this.versionPromise;
    }
}
exports.DbVersionProvider = DbVersionProvider;
function initDbVersionProvider(conn) {
    const metaGetter = new metaGetter_js_1.default(conn);
    const versionGetter = () => {
        return metaGetter.do().then((result) => (result.version ? result.version : ''));
    };
    return new DbVersionProvider(versionGetter);
}
exports.initDbVersionProvider = initDbVersionProvider;
class DbVersion {
    constructor(major, minor, patch) {
        this.checkNumber = (num) => {
            if (!Number.isSafeInteger(num)) {
                throw new Error(`Invalid number: ${num}`);
            }
        };
        this.show = () => this.major === 0 && this.major === this.minor && this.minor === this.patch
            ? ''
            : `${this.major}.${this.minor}${this.patch !== undefined ? `.${this.patch}` : ''}`;
        this.isAtLeast = (major, minor, patch) => {
            this.checkNumber(major);
            this.checkNumber(minor);
            if (this.major > major)
                return true;
            if (this.major < major)
                return false;
            if (this.minor > minor)
                return true;
            if (this.minor < minor)
                return false;
            if (this.patch !== undefined && patch !== undefined && this.patch >= patch) {
                this.checkNumber(patch);
                return true;
            }
            return false;
        };
        this.isLowerThan = (major, minor, patch) => !this.isAtLeast(major, minor, patch);
        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }
}
exports.DbVersion = DbVersion;
DbVersion.fromString = (version) => {
    let regex = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    let match = version.match(regex);
    if (match) {
        const [_, major, minor, patch] = match;
        return new DbVersion(parseInt(major, 10), parseInt(minor, 10), parseInt(patch, 10));
    }
    regex = /^v?(\d+)\.(\d+)$/;
    match = version.match(regex);
    if (match) {
        const [_, major, minor] = match;
        return new DbVersion(parseInt(major, 10), parseInt(minor, 10));
    }
    throw new Error(`Invalid version string: ${version}`);
};
