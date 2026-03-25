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
const __1 = require("../");
const BASE_URL = "http://localhost:8000";
const fetchMock = global.fetch;
describe("ZepClient", () => {
    let client;
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        fetchMock.resetMocks();
        client = yield __1.ZepClient.init(BASE_URL, "test-api-key");
    }));
    describe("getSession", () => {
        it("retrieves the correct session when sessionId is provided", () => __awaiter(void 0, void 0, void 0, function* () {
            const expectedSessionId = "test-session";
            const expectedSessionData = {
                uuid: "uuid",
                created_at: "2022-01-01T00:00:00Z",
                updated_at: "2022-01-01T00:00:00Z",
                session_id: expectedSessionId,
                metadata: {},
            };
            fetchMock.mockResponseOnce(JSON.stringify(expectedSessionData));
            const session = yield client.memory.getSession(expectedSessionId);
            expect(session.toDict()).toEqual(expectedSessionData);
        }));
    });
    // Test Suite for addSession()
    describe("addSession", () => {
        // Test for adding a session
        it("should add a session correctly when valid session data is provided", () => __awaiter(void 0, void 0, void 0, function* () {
            const expectedSessionId = "test-session";
            const sessionData = {
                session_id: expectedSessionId,
                metadata: { foo: "bar" },
            };
            const session = new __1.Session(sessionData);
            const expectedResponseData = Object.assign(Object.assign({}, sessionData), { uuid: "uuid", created_at: "2022-01-01T00:00:00Z", updated_at: "2022-01-01T00:00:00Z" });
            fetchMock.mockResponseOnce(JSON.stringify(expectedResponseData));
            const addedSession = yield client.memory.addSession(session);
            expect(addedSession.toDict()).toEqual(expectedResponseData);
        }));
    });
    // Test Suite for updateSession()
    describe("updateSession", () => {
        // Test for updating a session
        it("should update a session correctly when valid session data is provided", () => __awaiter(void 0, void 0, void 0, function* () {
            const expectedSessionId = "test-session";
            const sessionData = {
                session_id: expectedSessionId,
                metadata: { foo: "bar" },
            };
            const session = new __1.Session(sessionData);
            const expectedResponseData = Object.assign(Object.assign({}, sessionData), { uuid: "uuid", created_at: "2022-01-01T00:00:00Z", updated_at: "2022-01-01T00:00:00Z" });
            fetchMock.mockResponseOnce(JSON.stringify(expectedResponseData));
            const updatedSession = yield client.memory.updateSession(session);
            expect(updatedSession.toDict()).toEqual(expectedResponseData);
        }));
    });
    // Test Suite for listSessions()
    describe("listSessions", () => {
        // Test for retrieving sessions
        it("should retrieve sessions", () => __awaiter(void 0, void 0, void 0, function* () {
            const responseData = [
                {
                    uuid: "uuid1",
                    created_at: "2022-01-01T00:00:00Z",
                    updated_at: "2022-01-01T00:00:00Z",
                    session_id: "session1",
                    metadata: {},
                },
                {
                    uuid: "uuid2",
                    created_at: "2022-01-01T00:00:00Z",
                    updated_at: "2022-01-01T00:00:00Z",
                    session_id: "session2",
                    metadata: {},
                },
            ];
            fetchMock.mockResponseOnce(JSON.stringify(responseData));
            const sessions = yield client.memory.listSessions();
            expect(sessions).toEqual(responseData.map((session) => new __1.Session(session)));
        }));
        // Test for retrieving sessions with limit
        it("should retrieve sessions with limit", () => __awaiter(void 0, void 0, void 0, function* () {
            const responseData = [
                {
                    uuid: "uuid1",
                    created_at: "2022-01-01T00:00:00Z",
                    updated_at: "2022-01-01T00:00:00Z",
                    session_id: "session1",
                    metadata: {},
                },
            ];
            fetchMock.mockResponseOnce(JSON.stringify(responseData));
            const sessions = yield client.memory.listSessions(1);
            expect(sessions).toEqual(responseData.map((session) => new __1.Session(session)));
        }));
    });
    // Test Suite for listSessionsChunked()
    describe("listSessionsChunked", () => {
        // Test for retrieving all sessions in chunks
        it("should retrieve all sessions in chunks", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, e_1, _b, _c;
            const expectedSessionsData = [
                [
                    {
                        uuid: "uuid1",
                        created_at: "2022-01-01T00:00:00Z",
                        updated_at: "2022-01-01T00:00:00Z",
                        session_id: "session1",
                        metadata: {},
                    },
                    {
                        uuid: "uuid2",
                        created_at: "2022-01-01T00:00:00Z",
                        updated_at: "2022-01-01T00:00:00Z",
                        session_id: "session2",
                        metadata: {},
                    },
                ],
                [
                    {
                        uuid: "uuid3",
                        created_at: "2022-01-01T00:00:00Z",
                        updated_at: "2022-01-01T00:00:00Z",
                        session_id: "session3",
                        metadata: {},
                    },
                    {
                        uuid: "uuid4",
                        created_at: "2022-01-01T00:00:00Z",
                        updated_at: "2022-01-01T00:00:00Z",
                        session_id: "session4",
                        metadata: {},
                    },
                ],
            ];
            fetchMock.mockResponses(JSON.stringify(expectedSessionsData[0]), JSON.stringify(expectedSessionsData[1]), JSON.stringify([]));
            const sessionsChunked = [];
            try {
                for (var _d = true, _e = __asyncValues(client.memory.listSessionsChunked(2)), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const sessions = _c;
                    sessionsChunked.push(sessions.map((session) => session.toDict()));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
            expect(sessionsChunked).toEqual(expectedSessionsData);
        }));
    });
    // Test Suite for getMemory()
    describe("getMemory", () => {
        // Test for retrieving memory for a session
        it("should retrieve memory for a session", () => __awaiter(void 0, void 0, void 0, function* () {
            const responseData = {
                messages: [{ role: "human", content: "Hello" }],
                summary: {
                    uuid: "",
                    created_at: "",
                    content: "Memory summary",
                    recent_message_uuid: "",
                    token_count: 0,
                },
            };
            fetchMock.mockResponseOnce(JSON.stringify(responseData));
            const memory = yield client.memory.getMemory("test-session");
            expect(memory).toEqual(new __1.Memory({
                messages: [new __1.Message({ role: "human", content: "Hello" })],
                summary: new __1.Summary({
                    content: "Memory summary",
                    created_at: "",
                    recent_message_uuid: "",
                    token_count: 0,
                    uuid: "",
                }),
                metadata: {},
            }));
        }));
    });
    // Test for throwing NotFoundError if the session is not found
    it("should throw NotFoundError if the session is not found", () => __awaiter(void 0, void 0, void 0, function* () {
        fetchMock.mockResponseOnce(JSON.stringify({}), { status: 404 });
        yield expect(client.memory.getMemory("test-session")).rejects.toThrow(__1.NotFoundError);
    }));
    // Test for returning a Memory object with empty messages when no messages are found
    it("should return a Memory object with empty messages when no messages are found", () => __awaiter(void 0, void 0, void 0, function* () {
        const responseData = {
            messages: [],
            summary: {
                uuid: "",
                created_at: "",
                content: "",
                recent_message_uuid: "",
                token_count: 0,
            },
        };
        fetchMock.mockResponseOnce(JSON.stringify(responseData));
        const memory = yield client.memory.getMemory("test-session");
        expect(memory).toEqual(new __1.Memory({
            messages: [],
            summary: new __1.Summary({
                content: "",
                created_at: "",
                recent_message_uuid: "",
                token_count: 0,
                uuid: "",
            }),
            metadata: {},
        }));
    }));
    // Test for throwing APIError when unexpected status code is returned
    it("should throw APIError when unexpected status code is returned", () => __awaiter(void 0, void 0, void 0, function* () {
        fetchMock.mockResponseOnce(JSON.stringify({}), { status: 500 });
        yield expect(client.memory.getMemory("test-session")).rejects.toThrow(__1.APIError);
    }));
    // Test for retrieving last 'n' memories for a session when 'lastn' parameter is used
    it("should retrieve last 'n' memories for a session when 'lastn' parameter is used", () => __awaiter(void 0, void 0, void 0, function* () {
        const responseData = {
            messages: [
                { role: "system", content: "How can I assist you?" },
                { role: "human", content: "What's the weather like?" },
            ],
            summary: {
                uuid: "",
                created_at: "",
                content: "Memory summary",
                recent_message_uuid: "",
                token_count: 0,
            },
        };
        // Mock fetch call with specific URL and parameters
        fetchMock.mockIf((req) => req.url.startsWith(`${BASE_URL}/api/v1/sessions/test-session/memory`) && req.url.includes("lastn=2"), JSON.stringify(responseData));
        const memory = yield client.memory.getMemory("test-session", 2);
        expect(memory).toEqual(new __1.Memory({
            messages: [
                new __1.Message({
                    role: "system",
                    content: "How can I assist you?",
                }),
                new __1.Message({
                    role: "human",
                    content: "What's the weather like?",
                }),
            ],
            summary: new __1.Summary({
                uuid: "",
                created_at: "",
                content: "Memory summary",
                recent_message_uuid: "",
                token_count: 0,
            }),
            metadata: {},
        }));
    }));
    // Test Suite for addMemory()
    describe("addMemory", () => {
        it("should add a memory to a session", () => __awaiter(void 0, void 0, void 0, function* () {
            const memoryData = new __1.Memory({
                messages: [new __1.Message({ role: "human", content: "Hello again!" })],
                summary: new __1.Summary({
                    uuid: "",
                    created_at: "",
                    content: "Memory summary",
                    recent_message_uuid: "",
                    token_count: 0,
                }),
                metadata: {},
            });
            fetchMock.mockResponseOnce("OK");
            const result = yield client.memory.addMemory("test-session", memoryData);
            expect(result).toEqual("OK");
        }));
        // Test for throwing Error if the error response
        it("should throw APIError if !200 OK", () => __awaiter(void 0, void 0, void 0, function* () {
            const memoryData = new __1.Memory({
                messages: [
                    new __1.Message({ role: "system", content: "System message" }),
                ],
                summary: new __1.Summary({
                    uuid: "summary_uuid",
                    created_at: "2023-01-01T00:00:00Z",
                    content: "Memory summary",
                    recent_message_uuid: "recent_message_uuid",
                    token_count: 0,
                }),
                metadata: {},
            });
            // Mock a status code that is unexpected (500 in this case)
            fetchMock.mockResponseOnce(JSON.stringify({}), { status: 500 });
            yield expect(client.memory.addMemory("test-session", memoryData)).rejects.toThrow(__1.APIError);
        }));
    });
    // Test Suite for deleteMemory()
    describe("deleteMemory", () => {
        // Test for deleting memory for a session
        it("should delete memory for a session", () => __awaiter(void 0, void 0, void 0, function* () {
            const message = "Memory deleted";
            fetchMock.mockResponseOnce(message);
            const response = yield client.memory.deleteMemory("test-session");
            expect(response).toEqual(message);
        }));
        // Test for throwing NotFoundError if the session is not found
        it("should throw NotFoundError if the session is not found", () => __awaiter(void 0, void 0, void 0, function* () {
            fetchMock.mockResponseOnce(JSON.stringify({}), { status: 404 });
            yield expect(client.memory.deleteMemory("test-session")).rejects.toThrow(__1.NotFoundError);
        }));
        // Test for throwing APIError when unexpected status code is returned
        it("should throw APIError when unexpected status code is returned", () => __awaiter(void 0, void 0, void 0, function* () {
            fetchMock.mockResponseOnce(JSON.stringify({}), { status: 500 });
            yield expect(client.memory.deleteMemory("test-session")).rejects.toThrow(__1.APIError);
        }));
    });
    // Test Suite for searchMemory()
    describe("searchMemory", () => {
        // Test for searching memory for a session
        it("should search memory for a session", () => __awaiter(void 0, void 0, void 0, function* () {
            const searchPayload = {
                metadata: {
                    where: {
                        jsonpath: '$.system.entities[*] ? (@.Label == "WORK_OF_ART")',
                    },
                },
                text: "system message",
            };
            const responseData = [
                {
                    message: {
                        role: "system",
                        content: "system message",
                        uuid: "message_uuid",
                        created_at: "2023-01-01T00:00:00Z",
                    },
                    dist: undefined,
                    summary: undefined,
                    metadata: {},
                },
            ];
            fetchMock.mockResponseOnce(JSON.stringify(responseData));
            const searchResults = yield client.memory.searchMemory("test-session", searchPayload);
            expect(searchResults).toEqual(responseData);
        }));
        // Test for throwing NotFoundError if the session is not found
        it("should throw NotFoundError if the session is not found", () => __awaiter(void 0, void 0, void 0, function* () {
            const searchPayload = {
                query: "system",
                metadata: { metadata_key: "metadata_value" },
                text: "search text", // Replace with actual text
            };
            fetchMock.mockResponseOnce(JSON.stringify({}), { status: 404 });
            yield expect(client.memory.searchMemory("test-session", searchPayload)).rejects.toThrow(__1.NotFoundError);
        }));
        // Test for throwing APIError when unexpected status code is returned
        it("should throw APIError when unexpected status code is returned", () => __awaiter(void 0, void 0, void 0, function* () {
            const searchPayload = {
                query: "system",
                metadata: { metadata_key: "metadata_value" },
                text: "search text", // Replace with actual text
            };
            fetchMock.mockResponseOnce(JSON.stringify({}), { status: 500 });
            yield expect(client.memory.searchMemory("test-session", searchPayload)).rejects.toThrow(__1.APIError);
        })); // end it
    }); // end describe
});
