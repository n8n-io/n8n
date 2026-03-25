var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { WeaviateUnsupportedFeatureError } from '../../errors.js';
import { Serialize } from '../serialize/index.js';
export class Check {
    constructor(connection, name, dbVersionSupport, consistencyLevel, tenant) {
        this.getSearcher = () => this.connection.search(this.name, this.consistencyLevel, this.tenant);
        this.checkSupportForVectors = (vec) => __awaiter(this, void 0, void 0, function* () {
            if (vec === undefined || Serialize.isHybridNearTextSearch(vec))
                return false;
            const check = yield this.dbVersionSupport.supportsVectorsFieldInGRPC();
            return check.supports;
        });
        this.supportForSingleGroupedGenerative = () => __awaiter(this, void 0, void 0, function* () {
            const check = yield this.dbVersionSupport.supportsSingleGrouped();
            if (!check.supports)
                throw new WeaviateUnsupportedFeatureError(check.message);
            return check.supports;
        });
        this.supportForGenerativeConfigRuntime = (generativeConfig) => __awaiter(this, void 0, void 0, function* () {
            if (generativeConfig === undefined)
                return true;
            const check = yield this.dbVersionSupport.supportsGenerativeConfigRuntime();
            if (!check.supports)
                throw new WeaviateUnsupportedFeatureError(check.message);
            return check.supports;
        });
        this.nearSearch = () => this.getSearcher().then((search) => ({ search }));
        this.nearVector = (vec, opts) => {
            return Promise.all([this.getSearcher(), this.checkSupportForVectors(vec)]).then(([search, supportsVectors]) => {
                const is129 = supportsVectors;
                return {
                    search,
                    supportsVectors: is129,
                };
            });
        };
        this.hybridSearch = (opts) => {
            return Promise.all([this.getSearcher(), this.checkSupportForVectors(opts === null || opts === void 0 ? void 0 : opts.vector)]).then(([search, supportsVectors]) => {
                const is129 = supportsVectors;
                return {
                    search,
                    supportsVectors: is129,
                };
            });
        };
        this.fetchObjects = () => this.getSearcher().then((search) => ({ search }));
        this.fetchObjectById = () => this.getSearcher().then((search) => ({ search }));
        this.bm25 = () => this.getSearcher().then((search) => ({ search }));
        this.connection = connection;
        this.name = name;
        this.dbVersionSupport = dbVersionSupport;
        this.consistencyLevel = consistencyLevel;
        this.tenant = tenant;
    }
}
