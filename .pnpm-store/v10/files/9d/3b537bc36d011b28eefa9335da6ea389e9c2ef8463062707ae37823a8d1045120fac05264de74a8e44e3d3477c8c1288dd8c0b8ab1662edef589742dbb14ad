var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { toBase64FromMedia } from '../../utils/base64.js';
import { Deserialize } from '../deserialize/index.js';
import { Serialize } from '../serialize/index.js';
import { WeaviateInvalidInputError } from '../../errors.js';
import { Check } from './check.js';
class QueryManager {
    constructor(check) {
        this.check = check;
    }
    static use(connection, name, dbVersionSupport, consistencyLevel, tenant) {
        return new QueryManager(new Check(connection, name, dbVersionSupport, consistencyLevel, tenant));
    }
    parseReply(reply) {
        return __awaiter(this, void 0, void 0, function* () {
            const deserialize = yield Deserialize.use(this.check.dbVersionSupport);
            return deserialize.query(reply);
        });
    }
    parseGroupByReply(opts, reply) {
        return __awaiter(this, void 0, void 0, function* () {
            const deserialize = yield Deserialize.use(this.check.dbVersionSupport);
            return Serialize.search.isGroupBy(opts)
                ? deserialize.queryGroupBy(reply)
                : deserialize.query(reply);
        });
    }
    fetchObjectById(id, opts) {
        return this.check
            .fetchObjectById()
            .then(({ search }) => search.withFetch(Serialize.search.fetchObjectById(Object.assign({ id }, opts))))
            .then((reply) => this.parseReply(reply))
            .then((ret) => (ret.objects.length === 1 ? ret.objects[0] : null));
    }
    fetchObjects(opts) {
        return this.check
            .fetchObjects()
            .then(({ search }) => search.withFetch(Serialize.search.fetchObjects(opts)))
            .then((reply) => this.parseReply(reply));
    }
    bm25(query, opts) {
        return this.check
            .bm25()
            .then(({ search }) => search.withBm25(Serialize.search.bm25(query, opts)))
            .then((reply) => this.parseGroupByReply(opts, reply));
    }
    hybrid(query, opts) {
        return this.check
            .hybridSearch(opts)
            .then(({ search, supportsVectors }) => __awaiter(this, void 0, void 0, function* () {
            return ({
                search,
                args: yield Serialize.search.hybrid({
                    query,
                    supportsVectors,
                }, opts),
            });
        }))
            .then(({ search, args }) => search.withHybrid(args))
            .then((reply) => this.parseGroupByReply(opts, reply));
    }
    nearImage(image, opts) {
        return this.check
            .nearSearch()
            .then(({ search }) => {
            return toBase64FromMedia(image).then((image) => ({
                search,
                args: Serialize.search.nearImage({
                    image,
                }, opts),
            }));
        })
            .then(({ search, args }) => search.withNearImage(args))
            .then((reply) => this.parseGroupByReply(opts, reply));
    }
    nearMedia(media, type, opts) {
        return this.check
            .nearSearch()
            .then(({ search }) => {
            let send;
            switch (type) {
                case 'audio':
                    send = (media) => search.withNearAudio(Serialize.search.nearAudio({ audio: media }, opts));
                    break;
                case 'depth':
                    send = (media) => search.withNearDepth(Serialize.search.nearDepth({ depth: media }, opts));
                    break;
                case 'image':
                    send = (media) => search.withNearImage(Serialize.search.nearImage({ image: media }, opts));
                    break;
                case 'imu':
                    send = (media) => search.withNearIMU(Serialize.search.nearIMU({ imu: media }, opts));
                    break;
                case 'thermal':
                    send = (media) => search.withNearThermal(Serialize.search.nearThermal({ thermal: media }, opts));
                    break;
                case 'video':
                    send = (media) => search.withNearVideo(Serialize.search.nearVideo({ video: media }));
                    break;
                default:
                    throw new WeaviateInvalidInputError(`Invalid media type: ${type}`);
            }
            return toBase64FromMedia(media).then(send);
        })
            .then((reply) => this.parseGroupByReply(opts, reply));
    }
    nearObject(id, opts) {
        return this.check
            .nearSearch()
            .then(({ search }) => ({
            search,
            args: Serialize.search.nearObject({
                id,
            }, opts),
        }))
            .then(({ search, args }) => search.withNearObject(args))
            .then((reply) => this.parseGroupByReply(opts, reply));
    }
    nearText(query, opts) {
        return this.check
            .nearSearch()
            .then(({ search }) => ({
            search,
            args: Serialize.search.nearText({
                query,
            }, opts),
        }))
            .then(({ search, args }) => search.withNearText(args))
            .then((reply) => this.parseGroupByReply(opts, reply));
    }
    nearVector(vector, opts) {
        return this.check
            .nearVector(vector, opts)
            .then(({ search, supportsVectors }) => __awaiter(this, void 0, void 0, function* () {
            return ({
                search,
                args: yield Serialize.search.nearVector({
                    vector,
                    supportsVectors,
                }, opts),
            });
        }))
            .then(({ search, args }) => search.withNearVector(args))
            .then((reply) => this.parseGroupByReply(opts, reply));
    }
}
export default QueryManager.use;
export { queryFactory } from './factories.js';
export { Bm25Operator } from './utils.js';
