"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const errors_js_1 = require("../../errors.js");
const index_js_1 = require("../../schema/index.js");
const index_js_2 = require("../deserialize/index.js");
const index_js_3 = require("../serialize/index.js");
const parseValueOrValueArray = (value) => (Array.isArray(value) ? value : [value]);
const parseStringOrTenant = (tenant) => typeof tenant === 'string' ? tenant : tenant.name;
const parseTenantREST = (tenant) => ({
    name: tenant.name,
    activityStatus: index_js_2.Deserialize.activityStatusREST(tenant.activityStatus),
});
const tenants = (connection, collection, dbVersionSupport) => {
    const get = (names) => connection
        .tenants(collection)
        .then((builder) => builder.withGet({ names }))
        .then(index_js_2.Deserialize.tenantsGet);
    const update = (tenants) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        const out = [];
        try {
            for (var _d = true, _e = __asyncValues(index_js_3.Serialize.tenants(parseValueOrValueArray(tenants), index_js_3.Serialize.tenantUpdate).map((tenants) => new index_js_1.TenantsUpdater(connection, collection, tenants).do().then((res) => res.map(parseTenantREST)))), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                _c = _f.value;
                _d = false;
                const res = _c;
                out.push(...res);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return out;
    });
    return {
        create: (tenants) => new index_js_1.TenantsCreator(connection, collection, parseValueOrValueArray(tenants).map(index_js_3.Serialize.tenantCreate))
            .do()
            .then((res) => res.map(parseTenantREST)),
        get: () => get(),
        getByNames: (tenants) => get(tenants.map(parseStringOrTenant)),
        getByName: (tenant) => __awaiter(void 0, void 0, void 0, function* () {
            const tenantName = parseStringOrTenant(tenant);
            if (yield dbVersionSupport.supportsTenantGetRESTMethod().then((check) => !check.supports)) {
                return get([tenantName]).then((tenants) => { var _a; return (_a = tenants[tenantName]) !== null && _a !== void 0 ? _a : null; });
            }
            return connection
                .get(`/schema/${collection}/tenants/${tenantName}`)
                .then(parseTenantREST)
                .catch((err) => {
                if (err instanceof errors_js_1.WeaviateUnexpectedStatusCodeError && err.code === 404) {
                    return null;
                }
                throw err;
            });
        }),
        remove: (tenants) => new index_js_1.TenantsDeleter(connection, collection, parseValueOrValueArray(tenants).map(parseStringOrTenant)).do(),
        update,
        activate: (tenant) => {
            return update(parseValueOrValueArray(tenant).map((tenant) => ({
                name: parseStringOrTenant(tenant),
                activityStatus: 'ACTIVE',
            })));
        },
        deactivate: (tenant) => {
            return update(parseValueOrValueArray(tenant).map((tenant) => ({
                name: parseStringOrTenant(tenant),
                activityStatus: 'INACTIVE',
            })));
        },
        offload: (tenant) => {
            return update(parseValueOrValueArray(tenant).map((tenant) => ({
                name: parseStringOrTenant(tenant),
                activityStatus: 'OFFLOADED',
            })));
        },
    };
};
exports.default = tenants;
