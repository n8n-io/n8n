var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { WeaviateInvalidInputError } from '../../errors.js';
import { toBase64FromMedia } from '../../index.js';
import { Deserialize } from '../deserialize/index.js';
import { Check } from '../query/check.js';
import { Serialize } from '../serialize/index.js';
class GenerateManager {
    constructor(check) {
        this.check = check;
    }
    static use(connection, name, dbVersionSupport, consistencyLevel, tenant) {
        return new GenerateManager(new Check(connection, name, dbVersionSupport, consistencyLevel, tenant));
    }
    parseReply(reply) {
        return __awaiter(this, void 0, void 0, function* () {
            const deserialize = yield Deserialize.use(this.check.dbVersionSupport);
            return deserialize.generate(reply);
        });
    }
    parseGroupByReply(opts, reply) {
        return __awaiter(this, void 0, void 0, function* () {
            const deserialize = yield Deserialize.use(this.check.dbVersionSupport);
            return Serialize.search.isGroupBy(opts)
                ? deserialize.generateGroupBy(reply)
                : deserialize.generate(reply);
        });
    }
    fetchObjects(generate, opts) {
        return Promise.all([
            this.check.fetchObjects(),
            this.check.supportForSingleGroupedGenerative(),
            this.check.supportForGenerativeConfigRuntime(generate.config),
        ])
            .then(([{ search }, supportsSingleGrouped]) => __awaiter(this, void 0, void 0, function* () {
            return ({
                search,
                args: Object.assign(Object.assign({}, Serialize.search.fetchObjects(opts)), { generative: yield Serialize.generative({ supportsSingleGrouped }, generate) }),
            });
        }))
            .then(({ search, args }) => search.withFetch(args))
            .then((reply) => this.parseReply(reply));
    }
    bm25(query, generate, opts) {
        return Promise.all([
            this.check.bm25(),
            this.check.supportForSingleGroupedGenerative(),
            this.check.supportForGenerativeConfigRuntime(generate.config),
        ])
            .then(([{ search }, supportsSingleGrouped]) => __awaiter(this, void 0, void 0, function* () {
            return ({
                search,
                args: Object.assign(Object.assign({}, Serialize.search.bm25(query, opts)), { generative: yield Serialize.generative({ supportsSingleGrouped }, generate) }),
            });
        }))
            .then(({ search, args }) => search.withBm25(args))
            .then((reply) => this.parseGroupByReply(opts, reply));
    }
    hybrid(query, generate, opts) {
        return Promise.all([
            this.check.hybridSearch(opts),
            this.check.supportForSingleGroupedGenerative(),
            this.check.supportForGenerativeConfigRuntime(generate.config),
        ])
            .then(([{ search, supportsVectors }, supportsSingleGrouped]) => __awaiter(this, void 0, void 0, function* () {
            return ({
                search,
                args: Object.assign(Object.assign({}, (yield Serialize.search.hybrid({
                    query,
                    supportsVectors,
                }, opts))), { generative: yield Serialize.generative({ supportsSingleGrouped }, generate) }),
            });
        }))
            .then(({ search, args }) => search.withHybrid(args))
            .then((reply) => this.parseGroupByReply(opts, reply));
    }
    nearImage(image, generate, opts) {
        return Promise.all([
            this.check.nearSearch(),
            this.check.supportForSingleGroupedGenerative(),
            this.check.supportForGenerativeConfigRuntime(generate.config),
        ])
            .then(([{ search }, supportsSingleGrouped]) => __awaiter(this, void 0, void 0, function* () {
            return ({
                search,
                args: Object.assign(Object.assign({}, Serialize.search.nearImage({
                    image: yield toBase64FromMedia(image),
                }, opts)), { generative: yield Serialize.generative({ supportsSingleGrouped }, generate) }),
            });
        }))
            .then(({ search, args }) => search.withNearImage(args))
            .then((reply) => this.parseGroupByReply(opts, reply));
    }
    nearObject(id, generate, opts) {
        return Promise.all([
            this.check.nearSearch(),
            this.check.supportForSingleGroupedGenerative(),
            this.check.supportForGenerativeConfigRuntime(generate.config),
        ])
            .then(([{ search }, supportsSingleGrouped]) => __awaiter(this, void 0, void 0, function* () {
            return ({
                search,
                args: Object.assign(Object.assign({}, Serialize.search.nearObject({
                    id,
                }, opts)), { generative: yield Serialize.generative({ supportsSingleGrouped }, generate) }),
            });
        }))
            .then(({ search, args }) => search.withNearObject(args))
            .then((reply) => this.parseGroupByReply(opts, reply));
    }
    nearText(query, generate, opts) {
        return Promise.all([
            this.check.nearSearch(),
            this.check.supportForSingleGroupedGenerative(),
            this.check.supportForGenerativeConfigRuntime(generate.config),
        ])
            .then(([{ search }, supportsSingleGrouped]) => __awaiter(this, void 0, void 0, function* () {
            return ({
                search,
                args: Object.assign(Object.assign({}, Serialize.search.nearText({
                    query,
                }, opts)), { generative: yield Serialize.generative({ supportsSingleGrouped }, generate) }),
            });
        }))
            .then(({ search, args }) => search.withNearText(args))
            .then((reply) => this.parseGroupByReply(opts, reply));
    }
    nearVector(vector, generate, opts) {
        return Promise.all([
            this.check.nearVector(vector, opts),
            this.check.supportForSingleGroupedGenerative(),
            this.check.supportForGenerativeConfigRuntime(generate.config),
        ])
            .then(([{ search, supportsVectors }, supportsSingleGrouped]) => __awaiter(this, void 0, void 0, function* () {
            return ({
                search,
                args: Object.assign(Object.assign({}, (yield Serialize.search.nearVector({
                    vector,
                    supportsVectors,
                }, opts))), { generative: yield Serialize.generative({ supportsSingleGrouped }, generate) }),
            });
        }))
            .then(({ search, args }) => search.withNearVector(args))
            .then((reply) => this.parseGroupByReply(opts, reply));
    }
    nearMedia(media, type, generate, opts) {
        return Promise.all([
            this.check.nearSearch(),
            this.check.supportForSingleGroupedGenerative(),
            this.check.supportForGenerativeConfigRuntime(generate.config),
        ])
            .then(([{ search }, supportsSingleGrouped]) => {
            let send;
            switch (type) {
                case 'audio':
                    send = (media, generative) => search.withNearAudio(Object.assign(Object.assign({}, Serialize.search.nearAudio({ audio: media }, opts)), { generative }));
                    break;
                case 'depth':
                    send = (media, generative) => search.withNearDepth(Object.assign(Object.assign({}, Serialize.search.nearDepth({ depth: media }, opts)), { generative }));
                    break;
                case 'image':
                    send = (media, generative) => search.withNearImage(Object.assign(Object.assign({}, Serialize.search.nearImage({ image: media }, opts)), { generative }));
                    break;
                case 'imu':
                    send = (media, generative) => search.withNearIMU(Object.assign(Object.assign({}, Serialize.search.nearIMU({ imu: media }, opts)), { generative }));
                    break;
                case 'thermal':
                    send = (media, generative) => search.withNearThermal(Object.assign(Object.assign({}, Serialize.search.nearThermal({ thermal: media }, opts)), { generative }));
                    break;
                case 'video':
                    send = (media, generative) => search.withNearVideo(Object.assign(Object.assign({}, Serialize.search.nearVideo({ video: media })), { generative }));
                    break;
                default:
                    throw new WeaviateInvalidInputError(`Invalid media type: ${type}`);
            }
            return Promise.all([
                toBase64FromMedia(media),
                Serialize.generative({ supportsSingleGrouped }, generate),
            ]).then(([media, generative]) => send(media, generative));
        })
            .then((reply) => this.parseGroupByReply(opts, reply));
    }
}
export default GenerateManager.use;
export { generativeParameters } from './config.js';
