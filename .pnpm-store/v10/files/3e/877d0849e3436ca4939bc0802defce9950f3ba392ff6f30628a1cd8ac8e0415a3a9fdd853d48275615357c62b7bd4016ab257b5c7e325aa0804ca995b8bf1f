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
import ClassExists from '../schema/classExists.js';
import { ClassCreator, ClassDeleter, ClassGetter, SchemaGetter } from '../schema/index.js';
import collection from './collection/index.js';
import { classToCollection, makeVectorsConfig, resolveProperty, resolveReference } from './config/utils.js';
const collections = (connection, dbVersionSupport) => {
    const listAll = () => new SchemaGetter(connection)
        .do()
        .then((schema) => (schema.classes ? schema.classes.map((classToCollection)) : []));
    const deleteCollection = (name) => new ClassDeleter(connection).withClassName(name).do();
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
                    ? makeVectorsConfig(config.vectorizers)
                    : { vectorsConfig: undefined, vectorizers: [] };
                schema.vectorConfig = vectorsConfig;
                const properties = config.properties
                    ? config.properties.map((prop) => resolveProperty(prop, vectorizers))
                    : [];
                const references = config.references ? config.references.map((resolveReference)) : [];
                schema.properties = [...properties, ...references];
                yield new ClassCreator(connection).withClass(schema).do();
                return collection(connection, name, dbVersionSupport);
            });
        },
        createFromSchema: function (config) {
            return __awaiter(this, void 0, void 0, function* () {
                const { class: name } = yield new ClassCreator(connection).withClass(config).do();
                return collection(connection, name, dbVersionSupport);
            });
        },
        delete: deleteCollection,
        deleteAll: () => listAll().then((configs) => Promise.all(configs === null || configs === void 0 ? void 0 : configs.map((c) => deleteCollection(c.name)))),
        exists: (name) => new ClassExists(connection).withClassName(name).do(),
        export: (name) => new ClassGetter(connection)
            .withClassName(name)
            .do()
            .then((classToCollection)),
        listAll: listAll,
        get: (name) => collection(connection, name, dbVersionSupport),
        use: (name) => collection(connection, name, dbVersionSupport),
    };
};
export default collections;
export * from './aggregate/index.js';
export * from './backup/index.js';
export * from './cluster/index.js';
export * from './collection/index.js';
export * from './config/index.js';
export * from './configure/index.js';
export * from './data/index.js';
export * from './filters/index.js';
export * from './generate/index.js';
export * from './iterator/index.js';
export * from './query/index.js';
export * from './references/index.js';
export * from './sort/index.js';
export * from './tenants/index.js';
export * from './types/index.js';
export * from './vectors/multiTargetVector.js';
