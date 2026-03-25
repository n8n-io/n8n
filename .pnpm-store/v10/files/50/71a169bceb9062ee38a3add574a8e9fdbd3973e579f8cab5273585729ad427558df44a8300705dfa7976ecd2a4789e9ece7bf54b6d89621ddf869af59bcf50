var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import DocumentManager from "../document_manager";
import ZepClient from "../zep-client";
import { DocumentCollectionModel } from "../document_models";
const API_URL = "http://localhost:8000";
const BASE_URL = `${API_URL}/api/v1`;
const fetchMock = global.fetch;
describe("CollectionManager", () => {
    let client;
    let manager;
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        fetchMock.resetMocks();
        client = yield ZepClient.init(API_URL, "test-api-key");
        manager = new DocumentManager(client);
    }));
    describe("addCollection", () => {
        it("throws error when embeddingDimensions is not a positive integer", () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(manager.addCollection({ name: "test", embeddingDimensions: -1 })).rejects.toThrow("embeddingDimensions must be a positive integer");
        }));
        it("calls the correct endpoint with the correct method and headers", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c;
            const mockCollection = {
                name: "test",
                embeddingDimensions: 2,
                isAutoEmbedded: true,
            };
            fetchMock.mockResponseOnce(JSON.stringify(mockCollection));
            fetchMock.mockResponseOnce(JSON.stringify(mockCollection));
            yield manager.addCollection({ name: "test", embeddingDimensions: 2 });
            expect(fetchMock.mock.calls[1][0]).toEqual(`${BASE_URL}/collection/test`);
            expect((_a = fetchMock.mock.calls[1][1]) === null || _a === void 0 ? void 0 : _a.method).toEqual("POST");
            expect((_c = (_b = fetchMock.mock.calls[1][1]) === null || _b === void 0 ? void 0 : _b.headers) === null || _c === void 0 ? void 0 : _c["Content-Type"]).toEqual("application/json");
        }));
    });
    describe("getCollection", () => {
        it("throws error when name is not provided", () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(manager.getCollection("")).rejects.toThrow("Collection name must be provided");
        }));
        it("calls the correct endpoint with the correct headers", () => __awaiter(void 0, void 0, void 0, function* () {
            fetchMock.mockResponseOnce(JSON.stringify({}));
            yield manager.getCollection("test");
            // needs to be the second call because the first call is to healthz
            expect(fetchMock.mock.calls[1][0]).toEqual(`${BASE_URL}/collection/test`);
        }));
    });
    describe("updateCollection", () => {
        it("calls the correct endpoint with the correct method and headers", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c;
            const testData = {
                name: "test",
                description: "description",
                metadata: { foo: "bar" },
            };
            fetchMock.mockResponseOnce(JSON.stringify({}));
            fetchMock.mockResponseOnce(JSON.stringify(testData));
            yield manager.updateCollection(testData);
            expect(fetchMock.mock.calls[1][0]).toEqual(`${BASE_URL}/collection/test`);
            expect((_a = fetchMock.mock.calls[1][1]) === null || _a === void 0 ? void 0 : _a.method).toEqual("PATCH");
            expect((_c = (_b = fetchMock.mock.calls[1][1]) === null || _b === void 0 ? void 0 : _b.headers) === null || _c === void 0 ? void 0 : _c["Content-Type"]).toEqual("application/json");
        }));
    });
    describe("listCollections", () => {
        it("calls the correct endpoint and returns an array of collections", () => __awaiter(void 0, void 0, void 0, function* () {
            const collectionsData = [
                {
                    name: "test1",
                    description: "description1",
                    metadata: { foo: "bar1" },
                    isAutoEmbedded: true,
                    embeddingDimensions: 2,
                },
                {
                    name: "test2",
                    description: "description2",
                    metadata: { foo: "bar2" },
                    isAutoEmbedded: false,
                    embeddingDimensions: 2,
                },
            ];
            fetchMock.mockResponseOnce(JSON.stringify(collectionsData));
            const collections = yield manager.listCollections();
            expect(fetchMock.mock.calls[1][0]).toEqual(`${BASE_URL}/collection`);
            expect(collections).toBeInstanceOf(Array);
            collections.forEach((collection, i) => {
                expect(collection).toBeInstanceOf(DocumentCollectionModel);
                expect(collection.name).toEqual(collectionsData[i].name);
                expect(collection.description).toEqual(collectionsData[i].description);
                expect(collection.metadata).toEqual(collectionsData[i].metadata);
            });
        }));
    });
    describe("deleteCollection", () => {
        it("throws error when collectionName is not provided", () => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(manager.deleteCollection("")).rejects.toThrow("Collection name must be provided");
        }));
        it("calls the correct endpoint with the correct method and headers", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            fetchMock.mockResponseOnce(JSON.stringify({}));
            yield manager.deleteCollection("test");
            expect(fetchMock.mock.calls[1][0]).toEqual(`${BASE_URL}/collection/test`);
            expect((_a = fetchMock.mock.calls[1][1]) === null || _a === void 0 ? void 0 : _a.method).toEqual("DELETE");
        }));
    });
});
