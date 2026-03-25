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
import { User, ZepClient } from "../";
const BASE_URL = "http://localhost:8000";
const fetchMock = global.fetch;
describe("client.user", () => {
    let client;
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        fetchMock.resetMocks();
        client = yield ZepClient.init(BASE_URL, "test-api-key");
    }));
    describe("addUser", () => {
        it("adds a user correctly when valid user data is provided", () => __awaiter(void 0, void 0, void 0, function* () {
            const userData = {
                user_id: "test-user",
                metadata: { foo: "bar" },
                email: "ann@company.com",
                first_name: "Ann",
                last_name: "Smith",
            };
            const user = new User(userData);
            const expectedUser = {
                user_id: "test-user",
                metadata: { foo: "bar" },
                email: "ann@company.com",
                first_name: "Ann",
                last_name: "Smith",
            };
            fetchMock.mockResponseOnce(JSON.stringify(expectedUser));
            const responseUser = yield client.user.add(user);
            expect(responseUser.toDict()).toEqual(expectedUser);
        }));
    });
    describe("getUser", () => {
        it("retrieves the correct user when userId is provided", () => __awaiter(void 0, void 0, void 0, function* () {
            const expectedUserId = "test-user";
            const expectedUserData = {
                user_id: expectedUserId,
                metadata: {},
            };
            fetchMock.mockResponseOnce(JSON.stringify(expectedUserData));
            const user = yield client.user.get(expectedUserId);
            expect(user.toDict()).toEqual(expectedUserData);
        }));
    });
    describe("updateUser", () => {
        it("updates a user correctly when valid user data is provided", () => __awaiter(void 0, void 0, void 0, function* () {
            const userData = {
                user_id: "test-user",
                metadata: { foo: "bar" },
            };
            const user = new User(userData);
            const expectedUser = {
                user_id: "test-user",
                metadata: { foo: "bar" },
            };
            fetchMock.mockResponseOnce(JSON.stringify(expectedUser));
            const responseUser = yield client.user.update(user);
            expect(responseUser.toDict()).toEqual(expectedUser);
        }));
    });
    describe("deleteUser", () => {
        it("deletes a user correctly when userId is provided", () => __awaiter(void 0, void 0, void 0, function* () {
            const expectedUserId = "test-user";
            const expectedResponseText = "User deleted successfully";
            fetchMock.mockResponseOnce(expectedResponseText);
            const responseText = yield client.user.delete(expectedUserId);
            expect(responseText).toEqual(expectedResponseText);
        }));
    });
    describe("listUsers", () => {
        it("lists users correctly", () => __awaiter(void 0, void 0, void 0, function* () {
            const expectedUsersData = [
                {
                    user_id: "test-user1",
                    metadata: {},
                },
                {
                    user_id: "test-user2",
                    metadata: {},
                },
            ];
            fetchMock.mockResponseOnce(JSON.stringify(expectedUsersData));
            const users = yield client.user.list();
            expect(users.map((user) => user.toDict())).toEqual(expectedUsersData);
        }));
    });
    describe("listUsersChunked", () => {
        it("lists users in chunks correctly", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, e_1, _b, _c;
            const expectedUsersData = [
                [
                    {
                        user_id: "test-user1",
                        metadata: {},
                    },
                    {
                        user_id: "test-user2",
                        metadata: {},
                    },
                ],
                [
                    {
                        user_id: "test-user3",
                        metadata: {},
                    },
                    {
                        user_id: "test-user4",
                        metadata: {},
                    },
                ],
            ];
            fetchMock.mockResponses(JSON.stringify(expectedUsersData[0]), JSON.stringify(expectedUsersData[1]), JSON.stringify([]));
            const usersChunked = [];
            try {
                for (var _d = true, _e = __asyncValues(client.user.listChunked(2)), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const users = _c;
                    usersChunked.push(users.map((user) => user.toDict()));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
            expect(usersChunked).toEqual(expectedUsersData);
        }));
    });
});
