"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const classExists_js_1 = __importDefault(require("../schema/classExists.js"));
const index_js_1 = require("../schema/index.js");
const index_js_2 = __importDefault(require("./collection/index.js"));
const utils_js_1 = require("./config/utils.js");
const collections = (connection, dbVersionSupport) => {
    const listAll = () => new index_js_1.SchemaGetter(connection)
        .do()
        .then((schema) => (schema.classes ? schema.classes.map((utils_js_1.classToCollection)) : []));
    const deleteCollection = (name) => new index_js_1.ClassDeleter(connection).withClassName(name).do();
    return {
        create: function (config) {
            return __awaiter(this, void 0, void 0, function* () {
                const { name, invertedIndex, multiTenancy, replication, sharding } = config, rest = __rest(config, ["name", "invertedIndex", "multiTenancy", "replication", "sharding"]);
                const moduleConfig = {};
                if (config.generative) {
                    const generative = config.generative.name === 'generative-azure-openai' ? 'generative-openai' : config.generative.name;
                    moduleConfig[generative] = config.generative.config ? config.generative.config : {};
                }
                if (config.reranker) {
                    moduleConfig[config.reranker.name] = config.reranker.config ? config.reranker.config : {};
                }
                const schema = Object.assign(Object.assign({}, rest), { class: name, invertedIndexConfig: invertedIndex, moduleConfig: moduleConfig, multiTenancyConfig: multiTenancy, replicationConfig: replication, shardingConfig: sharding });
                const { vectorsConfig, vectorizers } = config.vectorizers
                    ? (0, utils_js_1.makeVectorsConfig)(config.vectorizers)
                    : { vectorsConfig: undefined, vectorizers: [] };
                schema.vectorConfig = vectorsConfig;
                const properties = config.properties
                    ? config.properties.map((prop) => (0, utils_js_1.resolveProperty)(prop, vectorizers))
                    : [];
                const references = config.references ? config.references.map((utils_js_1.resolveReference)) : [];
                schema.properties = [...properties, ...references];
                yield new index_js_1.ClassCreator(connection).withClass(schema).do();
                return (0, index_js_2.default)(connection, name, dbVersionSupport);
            });
        },
        createFromSchema: function (config) {
            return __awaiter(this, void 0, void 0, function* () {
                const { class: name } = yield new index_js_1.ClassCreator(connection).withClass(config).do();
                return (0, index_js_2.default)(connection, name, dbVersionSupport);
            });
        },
        delete: deleteCollection,
        deleteAll: () => listAll().then((configs) => Promise.all(configs === null || configs === void 0 ? void 0 : configs.map((c) => deleteCollection(c.name)))),
        exists: (name) => new classExists_js_1.default(connection).withClassName(name).do(),
        export: (name) => new index_js_1.ClassGetter(connection)
            .withClassName(name)
            .do()
            .then((utils_js_1.classToCollection)),
        listAll: listAll,
        get: (name) => (0, index_js_2.default)(connection, name, dbVersionSupport),
        use: (name) => (0, index_js_2.default)(connection, name, dbVersionSupport),
    };
};
exports.default = collections;
__exportStar(require("./aggregate/index.js"), exports);
__exportStar(require("./backup/index.js"), exports);
__exportStar(require("./cluster/index.js"), exports);
__exportStar(require("./collection/index.js"), exports);
__exportStar(require("./config/index.js"), exports);
__exportStar(require("./configure/index.js"), exports);
__exportStar(require("./data/index.js"), exports);
__exportStar(require("./filters/index.js"), exports);
__exportStar(require("./generate/index.js"), exports);
__exportStar(require("./iterator/index.js"), exports);
__exportStar(require("./query/index.js"), exports);
__exportStar(require("./references/index.js"), exports);
__exportStar(require("./sort/index.js"), exports);
__exportStar(require("./tenants/index.js"), exports);
__exportStar(require("./types/index.js"), exports);
__exportStar(require("./vectors/multiTargetVector.js"), exports);
