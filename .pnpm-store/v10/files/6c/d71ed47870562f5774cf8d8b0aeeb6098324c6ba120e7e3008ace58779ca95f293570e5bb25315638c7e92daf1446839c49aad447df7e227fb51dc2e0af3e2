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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const document_collection_1 = __importDefault(require("../document_collection"));
const document_models_1 = require("../document_models");
const utils_1 = require("../utils");
const API_URL = "http://localhost:8000";
const fetchMock = global.fetch;
const mockDocuments = [
    {
        document_id: "doc1",
        content: "Test document",
        metadata: { author: "John" },
    },
    {
        document_id: "doc2",
        content: "Test document 2",
        metadata: { author: "April" },
    },
];
const mockDocumentsWithEmbeddings = mockDocuments.map((doc) => (Object.assign(Object.assign({}, doc), { embedding: new Float32Array([0.1, 0.2]) })));
const mockCollection = {
    name: "test",
    embedding_dimensions: 2,
    is_auto_embedded: true,
};
const mockClient = {
    baseURL: API_URL,
    headers: {},
    getFullUrl(endpoint) {
        return `${this.baseURL}${utils_1.API_BASEPATH}${endpoint}`;
    },
};
describe("DocumentCollection", () => {
    describe("addDocuments", () => {
        beforeEach(() => {
            fetchMock.resetMocks();
        });
        it("calls the correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
            fetchMock.mockResponseOnce(JSON.stringify([]));
            const collection = new document_collection_1.default(mockClient, mockCollection);
            yield collection.addDocuments(mockDocuments);
            const expectedEndpoint = `${API_URL}/api/v1/collection/${mockCollection.name}/document`;
            expect(fetchMock.mock.calls[0][0]).toEqual(expectedEndpoint);
        }));
        it("successfully adds documents and parses response", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockResponse = ["1234", "5678"];
            // Mock a successful fetch response
            fetchMock.mockResponseOnce(JSON.stringify(mockResponse));
            const collection = new document_collection_1.default(mockClient, mockCollection);
            const result = yield collection.addDocuments(mockDocuments);
            expect(result).toEqual(mockResponse);
        }));
        it("sends correct data structure to server", () => __awaiter(void 0, void 0, void 0, function* () {
            fetchMock.mockResponseOnce(JSON.stringify([Object.assign({ uuid: "1234" }, mockDocuments[0])]));
            const collection = new document_collection_1.default(mockClient, mockCollection);
            yield collection.addDocuments([mockDocuments[0]]);
            if (!fetchMock.mock.calls[0][1] ||
                typeof fetchMock.mock.calls[0][1].body !== "string") {
                throw new Error("No request body sent or body is not a string");
            }
            const sentRequestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(sentRequestBody).toEqual([mockDocuments[0]]);
        }));
        it("correctly adds documents with Float32Array embeddings", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockResponse = ["1234", "5678"];
            // Mock a successful fetch response
            fetchMock.mockResponseOnce(JSON.stringify(mockResponse));
            const collection = new document_collection_1.default(mockClient, Object.assign(Object.assign({}, mockCollection), { is_auto_embedded: false }));
            const result = yield collection.addDocuments(mockDocumentsWithEmbeddings);
            expect(result).toEqual(mockResponse);
            if (!fetchMock.mock.calls[0][1] ||
                typeof fetchMock.mock.calls[0][1].body !== "string") {
                throw new Error("No request body sent or body is not a string");
            }
            const sentRequestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
            // Convert Float32Array to regular array for comparison
            const expectedRequestBody = mockDocumentsWithEmbeddings.map((doc) => (Object.assign(Object.assign({}, doc), { embedding: Array.from(doc.embedding) })));
            expect(sentRequestBody).toEqual(expectedRequestBody);
        }));
    });
    describe("updateDocument", () => {
        beforeEach(() => {
            fetchMock.resetMocks();
        });
        it("calls the correct endpoint with the correct verb", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            fetchMock.mockResponseOnce(JSON.stringify({}));
            const collection = new document_collection_1.default(mockClient, mockCollection);
            yield collection.updateDocument({
                uuid: "1234",
                documentId: "doc1",
                metadata: { author: "John" },
            });
            const expectedEndpoint = `${API_URL}/api/v1/collection/${mockCollection.name}/document/1234`;
            expect(fetchMock.mock.calls[0][0]).toEqual(expectedEndpoint);
            expect((_a = fetchMock.mock.calls[0][1]) === null || _a === void 0 ? void 0 : _a.method).toEqual("PATCH");
        }));
        it("sends correct data structure to server", () => __awaiter(void 0, void 0, void 0, function* () {
            fetchMock.mockResponseOnce(JSON.stringify({}));
            const collection = new document_collection_1.default(mockClient, mockCollection);
            const updateParams = {
                uuid: "1234",
                documentId: "doc1",
                metadata: { author: "John" },
            };
            const expectedParams = {
                uuid: "1234",
                document_id: "doc1",
                metadata: { author: "John" },
            };
            yield collection.updateDocument(updateParams);
            if (!fetchMock.mock.calls[0][1] ||
                typeof fetchMock.mock.calls[0][1].body !== "string") {
                throw new Error("No request body sent or body is not a string");
            }
            const sentRequestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(sentRequestBody).toEqual(expectedParams);
        }));
        it("throws error when collection name is not provided", () => __awaiter(void 0, void 0, void 0, function* () {
            const collection = new document_collection_1.default(mockClient, Object.assign(Object.assign({}, mockCollection), { name: "" }));
            yield expect(collection.updateDocument({
                uuid: "1234",
                documentId: "doc1",
                metadata: { author: "John" },
            })).rejects.toThrow("Collection name must be provided");
        }));
        it("throws error when document uuid is not provided", () => __awaiter(void 0, void 0, void 0, function* () {
            const collection = new document_collection_1.default(mockClient, mockCollection);
            yield expect(collection.updateDocument({
                uuid: "",
                documentId: "doc1",
                metadata: { author: "John" },
            })).rejects.toThrow("Document must have a uuid");
        }));
    });
    describe("deleteDocument", () => {
        beforeEach(() => {
            fetchMock.resetMocks();
        });
        it("calls the correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
            fetchMock.mockResponseOnce(JSON.stringify({}));
            const collection = new document_collection_1.default(mockClient, mockCollection);
            yield collection.deleteDocument("1234");
            const expectedEndpoint = `${API_URL}/api/v1/collection/${mockCollection.name}/document/uuid/1234`;
            expect(fetchMock.mock.calls[0][0]).toEqual(expectedEndpoint);
        }));
        it("sends DELETE request", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            fetchMock.mockResponseOnce(JSON.stringify({}));
            const collection = new document_collection_1.default(mockClient, mockCollection);
            yield collection.deleteDocument("1234");
            expect((_a = fetchMock.mock.calls[0][1]) === null || _a === void 0 ? void 0 : _a.method).toEqual("DELETE");
        }));
        it("throws error when collection name is not provided", () => __awaiter(void 0, void 0, void 0, function* () {
            const collection = new document_collection_1.default(mockClient, Object.assign(Object.assign({}, mockCollection), { name: "" }));
            yield expect(collection.deleteDocument("1234")).rejects.toThrow("Collection name must be provided");
        }));
        it("throws error when document uuid is not provided", () => __awaiter(void 0, void 0, void 0, function* () {
            const collection = new document_collection_1.default(mockClient, mockCollection);
            yield expect(collection.deleteDocument("")).rejects.toThrow("Document must have a uuid");
        }));
    });
    describe("getDocument", () => {
        const expectedDoc = Object.assign({ uuid: "1234" }, mockDocuments[0]);
        beforeEach(() => {
            fetchMock.resetMocks();
        });
        it("calls the correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
            fetchMock.mockResponseOnce(JSON.stringify(expectedDoc));
            const collection = new document_collection_1.default(mockClient, mockCollection);
            yield collection.getDocument("1234");
            const expectedEndpoint = `${API_URL}/api/v1/collection/${mockCollection.name}/document/1234`;
            expect(fetchMock.mock.calls[0][0]).toEqual(expectedEndpoint);
        }));
        it("returns the correct document", () => __awaiter(void 0, void 0, void 0, function* () {
            fetchMock.mockResponseOnce(JSON.stringify(expectedDoc));
            const collection = new document_collection_1.default(mockClient, mockCollection);
            const document = yield collection.getDocument("1234");
            expect(document).toEqual(expectedDoc);
        }));
        it("throws error when collection name is not provided", () => __awaiter(void 0, void 0, void 0, function* () {
            const collection = new document_collection_1.default(mockClient, Object.assign(Object.assign({}, mockCollection), { name: "" }));
            yield expect(collection.getDocument("1234")).rejects.toThrow("Collection name must be provided");
        }));
        it("throws error when document uuid is not provided", () => __awaiter(void 0, void 0, void 0, function* () {
            const collection = new document_collection_1.default(mockClient, mockCollection);
            yield expect(collection.getDocument("")).rejects.toThrow("Document must have a uuid");
        }));
    });
    describe("getDocuments", () => {
        beforeEach(() => {
            fetchMock.resetMocks();
        });
        const expectedDocuments = [
            Object.assign({ uuid: "1234" }, mockDocuments[0]),
            Object.assign({ uuid: "5678" }, mockDocuments[1]),
        ];
        it("calls the correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
            fetchMock.mockResponseOnce(JSON.stringify(expectedDocuments));
            const collection = new document_collection_1.default(mockClient, mockCollection);
            yield collection.getDocuments(["doc1", "doc2"]);
            const expectedEndpoint = `${API_URL}/api/v1/collection/${mockCollection.name}/document/list/get`;
            expect(fetchMock.mock.calls[0][0]).toEqual(expectedEndpoint);
        }));
        it("successfully gets documents and parses response", () => __awaiter(void 0, void 0, void 0, function* () {
            fetchMock.mockResponseOnce(JSON.stringify(expectedDocuments));
            const collection = new document_collection_1.default(mockClient, mockCollection);
            const result = yield collection.getDocuments(["doc1", "doc2"]);
            expect(result).toEqual(expectedDocuments);
        }));
        it("sends correct data structure to server", () => __awaiter(void 0, void 0, void 0, function* () {
            fetchMock.mockResponseOnce(JSON.stringify(expectedDocuments));
            const collection = new document_collection_1.default(mockClient, mockCollection);
            yield collection.getDocuments(["doc1", "doc2"]);
            if (!fetchMock.mock.calls[0][1] ||
                typeof fetchMock.mock.calls[0][1].body !== "string") {
                throw new Error("No request body sent or body is not a string");
            }
            const sentRequestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(sentRequestBody).toEqual({ uuids: ["doc1", "doc2"] });
        }));
        it("throws error when collection name is not provided", () => __awaiter(void 0, void 0, void 0, function* () {
            const collection = new document_collection_1.default(mockClient, Object.assign(Object.assign({}, mockCollection), { name: "" }));
            yield expect(collection.getDocuments(["doc1", "doc2"])).rejects.toThrow("Collection name must be provided");
        }));
    });
    describe("search", () => {
        beforeEach(() => {
            fetchMock.resetMocks();
        });
        const expectedDocuments = [
            Object.assign({ uuid: "1234", embedding: [0.5, 0.5] }, mockDocuments[0]),
            Object.assign({ uuid: "5678", embedding: [0.5, 0.5] }, mockDocuments[1]),
        ];
        it("calls the correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
            fetchMock.mockResponseOnce(JSON.stringify({
                results: expectedDocuments,
                query_vector: [0.5, 0.5],
            }));
            const collection = new document_collection_1.default(mockClient, mockCollection);
            yield collection.search({ text: "Test document" });
            const expectedEndpoint = `${API_URL}/api/v1/collection/${mockCollection.name}/search`;
            expect(fetchMock.mock.calls[0][0]).toEqual(expectedEndpoint);
        }));
        it("successfully searches documents and parses response", () => __awaiter(void 0, void 0, void 0, function* () {
            fetchMock.mockResponseOnce(JSON.stringify({
                results: expectedDocuments,
                query_vector: [0.5, 0.5],
            }));
            const collection = new document_collection_1.default(mockClient, mockCollection);
            const result = yield collection.search({ text: "Test document" });
            expect(result).toEqual((0, document_models_1.docsToDocsWithFloatArray)(expectedDocuments));
        }));
        it("throws error when collection name is not provided", () => __awaiter(void 0, void 0, void 0, function* () {
            const collection = new document_collection_1.default(mockClient, Object.assign(Object.assign({}, mockCollection), { name: "" }));
            yield expect(collection.search({ text: "Test document" })).rejects.toThrow("Collection name must be provided");
        }));
    });
});
