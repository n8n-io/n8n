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
Object.defineProperty(exports, "__esModule", { value: true });
const path_js_1 = require("../../batch/path.js");
const index_js_1 = require("../../data/index.js");
const path_js_2 = require("../../data/path.js");
const index_js_2 = require("../deserialize/index.js");
const utils_js_1 = require("../references/utils.js");
const index_js_3 = require("../serialize/index.js");
const addContext = (builder, consistencyLevel, tenant) => {
    if (consistencyLevel) {
        builder = builder.withConsistencyLevel(consistencyLevel);
    }
    if (tenant) {
        builder = builder.withTenant(tenant);
    }
    return builder;
};
const data = (connection, name, dbVersionSupport, consistencyLevel, tenant) => {
    const objectsPath = new path_js_2.ObjectsPath(dbVersionSupport);
    const referencesPath = new path_js_2.ReferencesPath(dbVersionSupport);
    const parseObject = (object) => __awaiter(void 0, void 0, void 0, function* () {
        if (!object) {
            return {};
        }
        const obj = {
            id: object.id,
            properties: object.properties
                ? index_js_3.Serialize.restProperties(object.properties, object.references)
                : undefined,
        };
        // as any required below because server uses swagger object as interface{} in Go to perform type switching
        // actual types are []number and [][]number but unions don't work in go-swagger
        if (Array.isArray(object.vectors)) {
            const requiresNamedVectorsInsertFix = yield dbVersionSupport.requiresNamedVectorsInsertFix();
            if (requiresNamedVectorsInsertFix.supports) {
                obj.vector = object.vectors;
                obj.vectors = { default: object.vectors };
            }
            else {
                obj.vector = object.vectors;
            }
        }
        else if (object.vectors) {
            obj.vectors = object.vectors;
        }
        return obj;
    });
    return {
        deleteById: (id) => objectsPath
            .buildDelete(id, name, consistencyLevel, tenant)
            .then((path) => connection.delete(path, undefined, false))
            .then(() => true),
        deleteMany: (where, opts) => connection
            .batch(name, consistencyLevel, tenant)
            .then((batch) => batch.withDelete({
            filters: index_js_3.Serialize.filtersGRPC(where),
            dryRun: opts === null || opts === void 0 ? void 0 : opts.dryRun,
            verbose: opts === null || opts === void 0 ? void 0 : opts.verbose,
        }))
            .then((reply) => index_js_2.Deserialize.deleteMany(reply, opts === null || opts === void 0 ? void 0 : opts.verbose)),
        exists: (id) => addContext(new index_js_1.Checker(connection, objectsPath).withId(id).withClassName(name), consistencyLevel, tenant).do(),
        insert: (obj) => Promise.all([
            objectsPath.buildCreate(consistencyLevel),
            parseObject(obj ? (index_js_3.DataGuards.isDataObject(obj) ? obj : { properties: obj }) : obj),
        ]).then(([path, object]) => connection
            .postReturn(path, Object.assign({ class: name, tenant: tenant }, object))
            .then((obj) => obj.id)),
        insertMany: (objects) => connection.batch(name, consistencyLevel).then((batch) => __awaiter(void 0, void 0, void 0, function* () {
            const requiresNamedVectorsInsertFix = yield dbVersionSupport.requiresNamedVectorsInsertFix();
            const serialized = yield index_js_3.Serialize.batchObjects(name, objects, requiresNamedVectorsInsertFix.supports, tenant);
            const start = Date.now();
            const reply = yield batch.withObjects({ objects: serialized.mapped });
            const end = Date.now();
            const elapsedSeconds = (end - start) / 1000;
            return index_js_2.Deserialize.batchObjects(reply, serialized.batch, serialized.mapped, elapsedSeconds);
        })),
        referenceAdd: (args) => referencesPath
            .build(args.fromUuid, name, args.fromProperty, consistencyLevel, tenant)
            .then((path) => Promise.all((0, utils_js_1.referenceToBeacons)(args.to).map((beacon) => connection.postEmpty(path, beacon))))
            .then(() => { }),
        referenceAddMany: (refs) => {
            const path = (0, path_js_1.buildRefsPath)(new URLSearchParams(consistencyLevel ? { consistency_level: consistencyLevel } : {}));
            const references = [];
            refs.forEach((ref) => {
                (0, utils_js_1.referenceToBeacons)(ref.to).forEach((beacon) => {
                    references.push({
                        from: `weaviate://localhost/${name}/${ref.fromUuid}/${ref.fromProperty}`,
                        to: beacon.beacon,
                        tenant: tenant,
                    });
                });
            });
            const start = Date.now();
            return connection
                .postReturn(path, references)
                .then((res) => {
                const end = Date.now();
                const errors = {};
                res.forEach((entry, idx) => {
                    var _a, _b, _c, _d, _e, _f, _g;
                    if (((_a = entry.result) === null || _a === void 0 ? void 0 : _a.status) === 'FAILED') {
                        errors[idx] = {
                            message: ((_d = (_c = (_b = entry.result) === null || _b === void 0 ? void 0 : _b.errors) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d[0].message)
                                ? (_g = (_f = (_e = entry.result) === null || _e === void 0 ? void 0 : _e.errors) === null || _f === void 0 ? void 0 : _f.error) === null || _g === void 0 ? void 0 : _g[0].message
                                : 'unknown error',
                            reference: references[idx],
                        };
                    }
                });
                return {
                    elapsedSeconds: (end - start) / 1000,
                    errors: errors,
                    hasErrors: Object.keys(errors).length > 0,
                };
            });
        },
        referenceDelete: (args) => referencesPath
            .build(args.fromUuid, name, args.fromProperty, consistencyLevel, tenant)
            .then((path) => Promise.all((0, utils_js_1.referenceToBeacons)(args.to).map((beacon) => connection.delete(path, beacon, false))))
            .then(() => { }),
        referenceReplace: (args) => referencesPath
            .build(args.fromUuid, name, args.fromProperty, consistencyLevel, tenant)
            .then((path) => connection.put(path, (0, utils_js_1.referenceToBeacons)(args.to), false)),
        replace: (obj) => Promise.all([objectsPath.buildUpdate(obj.id, name, consistencyLevel), parseObject(obj)]).then(([path, object]) => connection.put(path, Object.assign({ class: name, tenant: tenant }, object))),
        update: (obj) => Promise.all([objectsPath.buildUpdate(obj.id, name, consistencyLevel), parseObject(obj)]).then(([path, object]) => connection.patch(path, Object.assign({ class: name, tenant: tenant }, object))),
    };
};
exports.default = data;
