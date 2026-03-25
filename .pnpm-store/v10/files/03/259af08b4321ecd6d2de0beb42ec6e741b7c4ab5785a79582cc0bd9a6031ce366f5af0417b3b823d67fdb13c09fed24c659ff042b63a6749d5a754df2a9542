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
const __1 = require("../");
const BASE_URL = "http://localhost:8000";
const fetchMock = global.fetch;
describe("ZepClient", () => {
    let client;
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        fetchMock.resetMocks();
        client = yield __1.ZepClient.init(BASE_URL, "test-api-key");
    }));
    describe("ZepClient Auth", () => {
        it("sets the correct Authorization header when apiKey is provided", () => __awaiter(void 0, void 0, void 0, function* () {
            const expectedAuthorizationHeader = "Bearer test-api-key";
            fetchMock.mockResponseOnce((req) => {
                expect(req.headers.get("Authorization")).toEqual(expectedAuthorizationHeader);
                return Promise.resolve({
                    status: 200,
                    body: JSON.stringify({}),
                });
            });
        }));
    });
});
