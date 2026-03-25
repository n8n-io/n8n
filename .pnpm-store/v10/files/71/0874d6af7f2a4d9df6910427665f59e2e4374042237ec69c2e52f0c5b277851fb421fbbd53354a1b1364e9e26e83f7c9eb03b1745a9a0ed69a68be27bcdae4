"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.security = security;
const types_1 = require("../framework/types");
const defaultSecurityHandler = (req, scopes, schema) => true;
function extractErrorsFromResults(results) {
    return results.map(result => {
        if (Array.isArray(result)) {
            return result.map(it => it).filter(it => !it.success);
        }
        return [result].filter(it => !it.success);
    }).flatMap(it => [...it]);
}
function didAllSecurityRequirementsPass(results) {
    return results.every(it => it.success);
}
function didOneSchemaPassValidation(results) {
    return results.some(result => Array.isArray(result) ? didAllSecurityRequirementsPass(result) : result.success);
}
function security(apiDoc, securityHandlers) {
    return async (req, res, next) => {
        var _d, _e, _f;
        // TODO move the following 3 check conditions to a dedicated upstream middleware
        if (!req.openapi) {
            // this path was not found in open api and
            // this path is not defined under an openapi base path
            // skip it
            return next();
        }
        const openapi = req.openapi;
        // use the local security object or fallback to api doc's security or undefined
        const securities = (_d = openapi.schema.security) !== null && _d !== void 0 ? _d : apiDoc.security;
        const path = openapi.openApiRoute;
        if (!path || !Array.isArray(securities) || securities.length === 0) {
            return next();
        }
        const securitySchemes = (_e = apiDoc.components) === null || _e === void 0 ? void 0 : _e.securitySchemes;
        if (!securitySchemes) {
            const message = `security referenced at path ${path}, but not defined in 'components.securitySchemes'`;
            return next(new types_1.InternalServerError({ path: path, message: message }));
        }
        try {
            const results = await new SecuritySchemes(securitySchemes, securityHandlers, securities).executeHandlers(req);
            // TODO handle AND'd and OR'd security
            // This assumes OR only! i.e. at least one security passed authentication
            const success = didOneSchemaPassValidation(results);
            if (success) {
                next();
            }
            else {
                const errors = extractErrorsFromResults(results);
                throw errors[0];
            }
        }
        catch (e) {
            const message = ((_f = e === null || e === void 0 ? void 0 : e.error) === null || _f === void 0 ? void 0 : _f.message) || 'unauthorized';
            const err = types_1.HttpError.create({
                status: e.status,
                path: path,
                message: message,
            });
            /*const err =
              e.status == 500
                ? new InternalServerError({ path: path, message: message })
                : e.status == 403
                ? new Forbidden({ path: path, message: message })
                : new Unauthorized({ path: path, message: message });*/
            next(err);
        }
    };
}
class SecuritySchemes {
    constructor(securitySchemes, securityHandlers, securities) {
        this.securitySchemes = securitySchemes;
        this.securityHandlers = securityHandlers;
        this.securities = securities;
    }
    async executeHandlers(req) {
        // use a fallback handler if security handlers is not specified
        // This means if security handlers is specified, the user must define
        // all security handlers
        const fallbackHandler = !this.securityHandlers
            ? defaultSecurityHandler
            : null;
        const promises = this.securities.map(async (s) => {
            if (Util.isEmptyObject(s)) {
                // anonymous security
                return [{ success: true }];
            }
            return Promise.all(Object.keys(s).map(async (securityKey) => {
                var _a, _b, _c;
                try {
                    const scheme = this.securitySchemes[securityKey];
                    const handler = (_b =
                        (_a = this.securityHandlers) === null || _a === void 0
                            ? void 0
                            : _a[securityKey]) !== null && _b !== void 0
                        ? _b
                        : fallbackHandler;
                    const scopesTmp = s[securityKey];
                    const scopes = Array.isArray(scopesTmp) ? scopesTmp : [];
                    if (!scheme) {
                        const message = `components.securitySchemes.${securityKey} does not exist`;
                        throw new types_1.InternalServerError({ message });
                    }
                    if (!scheme.hasOwnProperty('type')) {
                        const message = `components.securitySchemes.${securityKey} must have property 'type'`;
                        throw new types_1.InternalServerError({ message });
                    }
                    if (!handler) {
                        const message = `a security handler for '${securityKey}' does not exist`;
                        throw new types_1.InternalServerError({ message });
                    }
                    new AuthValidator(req, scheme, scopes).validate();
                    // expected handler results are:
                    // - throw exception,
                    // - return true,
                    // - return Promise<true>,
                    // - return false,
                    // - return Promise<false>
                    // everything else should be treated as false
                    const securityScheme = scheme;
                    const success = await handler(req, scopes, securityScheme);
                    if (success === true) {
                        return { success };
                    }
                    else {
                        throw Error();
                    }
                }
                catch (e) {
                    return {
                        success: false,
                        status: (_c = e.status) !== null && _c !== void 0 ? _c : 401,
                        error: e,
                    };
                }
            }));
        });
        return Promise.all(promises);
    }
}
class AuthValidator {
    constructor(req, scheme, scopes = []) {
        const openapi = req.openapi;
        this.req = req;
        this.scheme = scheme;
        this.path = openapi.openApiRoute;
        this.scopes = scopes;
    }
    validate() {
        this.validateApiKey();
        this.validateHttp();
        this.validateOauth2();
        this.validateOpenID();
    }
    validateOauth2() {
        const { req, scheme, path } = this;
        if (['oauth2'].includes(scheme.type.toLowerCase())) {
            // TODO oauth2 validation
        }
    }
    validateOpenID() {
        const { req, scheme, path } = this;
        if (['openIdConnect'].includes(scheme.type.toLowerCase())) {
            // TODO openidconnect validation
        }
    }
    validateHttp() {
        var _d, _e;
        const { req, scheme, path } = this;
        if (['http'].includes(scheme.type.toLowerCase())) {
            const authHeader = req.headers['authorization'] &&
                req.headers['authorization'].toLowerCase();
            // req.cookies will be `undefined` without `cookie-parser` middleware
            const authCookie = ((_d = req.cookies) === null || _d === void 0 ? void 0 : _d[scheme.name]) || ((_e = req.signedCookies) === null || _e === void 0 ? void 0 : _e[scheme.name]);
            const type = scheme.scheme && scheme.scheme.toLowerCase();
            if (type === 'bearer') {
                if (authHeader && !authHeader.includes('bearer')) {
                    throw Error(`Authorization header with scheme 'Bearer' required`);
                }
                if (!authHeader && !authCookie) {
                    if (scheme.in === 'cookie') {
                        throw Error(`Cookie authentication required`);
                    }
                    else {
                        throw Error(`Authorization header required`);
                    }
                }
            }
            if (type === 'basic') {
                if (!authHeader) {
                    throw Error(`Authorization header required`);
                }
                if (!authHeader.includes('basic')) {
                    throw Error(`Authorization header with scheme 'Basic' required`);
                }
            }
        }
    }
    validateApiKey() {
        var _d;
        const { req, scheme, path } = this;
        if (scheme.type === 'apiKey') {
            if (scheme.in === 'header') {
                if (!req.headers[scheme.name.toLowerCase()]) {
                    throw Error(`'${scheme.name}' header required`);
                }
            }
            else if (scheme.in === 'query') {
                if (!req.query[scheme.name]) {
                    throw Error(`query parameter '${scheme.name}' required`);
                }
            }
            else if (scheme.in === 'cookie') {
                if (!req.cookies[scheme.name] && !((_d = req.signedCookies) === null || _d === void 0 ? void 0 : _d[scheme.name])) {
                    throw Error(`cookie '${scheme.name}' required`);
                }
            }
        }
    }
}
class Util {
    static isEmptyObject(o) {
        return (typeof o === 'object' &&
            Object.entries(o).length === 0 &&
            o.constructor === Object);
    }
}
//# sourceMappingURL=openapi.security.js.map