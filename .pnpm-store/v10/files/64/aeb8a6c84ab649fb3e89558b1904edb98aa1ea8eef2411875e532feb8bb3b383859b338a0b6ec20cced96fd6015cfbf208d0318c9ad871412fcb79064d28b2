"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferencesPath = exports.ObjectsPath = void 0;
const string_js_1 = require("../validation/string.js");
const version_js_1 = require("../validation/version.js");
const objectsPathPrefix = '/objects';
class ObjectsPath {
    constructor(dbVersionSupport) {
        this.dbVersionSupport = dbVersionSupport;
    }
    buildCreate(consistencyLevel) {
        return this.build({ consistencyLevel }, [this.addQueryParams]);
    }
    buildDelete(id, className, consistencyLevel, tenant) {
        return this.build({ id, className, consistencyLevel, tenant: tenant }, [
            this.addClassNameDeprecatedNotSupportedCheck,
            this.addId,
            this.addQueryParams,
        ]);
    }
    buildCheck(id, className, consistencyLevel, tenant) {
        return this.build({ id, className, consistencyLevel, tenant }, [
            this.addClassNameDeprecatedNotSupportedCheck,
            this.addId,
            this.addQueryParams,
        ]);
    }
    buildGetOne(id, className, additional, consistencyLevel, nodeName, tenant) {
        return this.build({ id, className, additional: additional, consistencyLevel, nodeName, tenant: tenant }, [
            this.addClassNameDeprecatedNotSupportedCheck,
            this.addId,
            this.addQueryParams,
        ]);
    }
    buildGet(className, limit, additional, after, tenant) {
        return this.build({ className, limit, additional, after, tenant: tenant }, [this.addQueryParamsForGet]);
    }
    buildUpdate(id, className, consistencyLevel) {
        return this.build({ id, className, consistencyLevel }, [
            this.addClassNameDeprecatedCheck,
            this.addId,
            this.addQueryParams,
        ]);
    }
    buildMerge(id, className, consistencyLevel) {
        return this.build({ id, className, consistencyLevel }, [
            this.addClassNameDeprecatedCheck,
            this.addId,
            this.addQueryParams,
        ]);
    }
    build(params, modifiers) {
        return this.dbVersionSupport.supportsClassNameNamespacedEndpointsPromise().then((support) => {
            let path = objectsPathPrefix;
            modifiers.forEach((modifier) => {
                path = modifier(params, path, support);
            });
            return path;
        });
    }
    addClassNameDeprecatedNotSupportedCheck(params, path, support) {
        if (support.supports) {
            if ((0, string_js_1.isValidStringProperty)(params.className)) {
                return `${path}/${params.className}`;
            }
            else {
                support.warns.deprecatedNonClassNameNamespacedEndpointsForObjects();
            }
        }
        else {
            support.warns.notSupportedClassNamespacedEndpointsForObjects();
        }
        return path;
    }
    addClassNameDeprecatedCheck(params, path, support) {
        if (support.supports) {
            if ((0, string_js_1.isValidStringProperty)(params.className)) {
                return `${path}/${params.className}`;
            }
            else {
                support.warns.deprecatedNonClassNameNamespacedEndpointsForObjects();
            }
        }
        return path;
    }
    addId(params, path) {
        if ((0, string_js_1.isValidStringProperty)(params.id)) {
            return `${path}/${params.id}`;
        }
        return path;
    }
    addQueryParams(params, path) {
        const queryParams = [];
        if (Array.isArray(params.additional) && params.additional.length > 0) {
            queryParams.push(`include=${params.additional.join(',')}`);
        }
        if ((0, string_js_1.isValidStringProperty)(params.nodeName)) {
            queryParams.push(`node_name=${params.nodeName}`);
        }
        if ((0, string_js_1.isValidStringProperty)(params.consistencyLevel)) {
            queryParams.push(`consistency_level=${params.consistencyLevel}`);
        }
        if ((0, string_js_1.isValidStringProperty)(params.tenant)) {
            queryParams.push(`tenant=${params.tenant}`);
        }
        if (queryParams.length > 0) {
            return `${path}?${queryParams.join('&')}`;
        }
        return path;
    }
    addQueryParamsForGet(params, path, support) {
        const queryParams = [];
        if (Array.isArray(params.additional) && params.additional.length > 0) {
            queryParams.push(`include=${params.additional.join(',')}`);
        }
        if (typeof params.limit == 'number' && params.limit > 0) {
            queryParams.push(`limit=${params.limit}`);
        }
        if ((0, string_js_1.isValidStringProperty)(params.className)) {
            if (support.supports) {
                queryParams.push(`class=${params.className}`);
            }
            else {
                support.warns.notSupportedClassParameterInEndpointsForObjects();
            }
        }
        if ((0, string_js_1.isValidStringProperty)(params.after)) {
            queryParams.push(`after=${params.after}`);
        }
        if ((0, string_js_1.isValidStringProperty)(params.tenant)) {
            queryParams.push(`tenant=${params.tenant}`);
        }
        if (queryParams.length > 0) {
            return `${path}?${queryParams.join('&')}`;
        }
        return path;
    }
}
exports.ObjectsPath = ObjectsPath;
class ReferencesPath {
    constructor(dbVersionSupport) {
        this.dbVersionSupport = dbVersionSupport;
    }
    build(id, className, property, consistencyLevel, tenant) {
        return this.dbVersionSupport.supportsClassNameNamespacedEndpointsPromise().then((support) => {
            let path = objectsPathPrefix;
            if (support.supports) {
                if ((0, string_js_1.isValidStringProperty)(className)) {
                    path = `${path}/${className}`;
                }
                else {
                    support.warns.deprecatedNonClassNameNamespacedEndpointsForReferences();
                }
            }
            else {
                support.warns.notSupportedClassNamespacedEndpointsForReferences();
            }
            if (support.version) {
                if (!(0, version_js_1.isValidWeaviateVersion)(support.version)) {
                    support.warns.deprecatedWeaviateTooOld();
                }
            }
            if ((0, string_js_1.isValidStringProperty)(id)) {
                path = `${path}/${id}`;
            }
            path = `${path}/references`;
            if ((0, string_js_1.isValidStringProperty)(property)) {
                path = `${path}/${property}`;
            }
            const queryParams = [];
            if ((0, string_js_1.isValidStringProperty)(consistencyLevel)) {
                queryParams.push(`consistency_level=${consistencyLevel}`);
            }
            if ((0, string_js_1.isValidStringProperty)(tenant)) {
                queryParams.push(`tenant=${tenant}`);
            }
            if (queryParams.length > 0) {
                path = `${path}?${queryParams.join('&')}`;
            }
            return path;
        });
    }
}
exports.ReferencesPath = ReferencesPath;
