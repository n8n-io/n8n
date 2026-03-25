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
const errors_1 = require("../errors");
const utils_1 = require("../utils");
const zep_client_1 = __importDefault(require("../zep-client"));
const fetchMock = global.fetch;
describe("Utility functions", () => {
    let client;
    beforeEach(() => {
        client = new zep_client_1.default("http://localhost:3000");
    });
    test("warnDeprecation", () => {
        console.warn = jest.fn();
        (0, utils_1.warnDeprecation)("testFunction");
        expect(console.warn).toHaveBeenCalledWith("Warning: testFunction is deprecated and will be removed in the next major release.");
    });
    describe("isVersionGreaterOrEqual", () => {
        test("returns false if version is null", () => {
            expect((0, utils_1.isVersionGreaterOrEqual)(null)).toBe(false);
        });
        test("returns true if version is equal to minimum", () => {
            expect((0, utils_1.isVersionGreaterOrEqual)(utils_1.MINIMUM_SERVER_VERSION)).toBe(true);
        });
        test("returns false if version is less than minimum", () => {
            expect((0, utils_1.isVersionGreaterOrEqual)("0.8.0")).toBe(false);
        });
        test("returns false if version is invalid semver", () => {
            expect((0, utils_1.isVersionGreaterOrEqual)("a")).toBe(false);
        });
    });
    describe("handleRequest", () => {
        beforeEach(() => {
            fetchMock.resetMocks();
        });
        test("throws NotFoundError for 404 status", () => __awaiter(void 0, void 0, void 0, function* () {
            fetchMock.mockResponseOnce("", { status: 404 });
            yield expect((0, utils_1.handleRequest)(fetch("/not-found"))).rejects.toThrow(errors_1.NotFoundError);
        }));
        test("throws AuthenticationError for 401 status", () => __awaiter(void 0, void 0, void 0, function* () {
            fetchMock.mockResponseOnce("", { status: 401 });
            yield expect((0, utils_1.handleRequest)(fetch("/unauthorized"))).rejects.toThrow(errors_1.AuthenticationError);
        }));
        test("throws APIError for other non-ok status", () => __awaiter(void 0, void 0, void 0, function* () {
            fetchMock.mockResponseOnce("Server error", { status: 500 });
            yield expect((0, utils_1.handleRequest)(fetch("/error"))).rejects.toThrow(errors_1.APIError);
        }));
    });
    test("toDictFilterEmpty", () => {
        const obj = {
            key1: "value1",
            key2: null,
            key3: undefined,
            key4: "value4",
        };
        expect((0, utils_1.toDictFilterEmpty)(obj)).toEqual({
            key1: "value1",
            key4: "value4",
        });
    });
    describe("isFloat", () => {
        it("returns true for floating-point numbers and zero", () => {
            expect((0, utils_1.isFloat)(1.5)).toBe(true);
            expect((0, utils_1.isFloat)(-0.1)).toBe(true);
            expect((0, utils_1.isFloat)(0.0)).toBe(true);
        });
        it("returns false for integers", () => {
            expect((0, utils_1.isFloat)(1)).toBe(false);
            expect((0, utils_1.isFloat)(-1)).toBe(false);
        });
        it("returns false for non-numbers", () => {
            expect((0, utils_1.isFloat)("1.5")).toBe(false);
            expect((0, utils_1.isFloat)("test")).toBe(false);
            expect((0, utils_1.isFloat)(null)).toBe(false);
            expect((0, utils_1.isFloat)(undefined)).toBe(false);
        });
    });
    describe("getFullUrl", () => {
        const expectedUrl = "http://localhost:3000/api/v1/testEndpoint";
        it("should correctly construct a URL without leading or trailing slashes", () => {
            const endpoint = "testEndpoint";
            expect(client.getFullUrl(endpoint)).toBe(expectedUrl);
        });
        it("should correctly construct a URL with leading slash in endpoint", () => {
            const endpoint = "/testEndpoint";
            expect(client.getFullUrl(endpoint)).toBe(expectedUrl);
        });
        it("should correctly construct a URL with trailing slash in endpoint", () => {
            const endpoint = "testEndpoint/";
            expect(client.getFullUrl(endpoint)).toBe(expectedUrl);
        });
        it("should correctly construct a URL with both leading and trailing slashes in endpoint", () => {
            const endpoint = "//testEndpoint/";
            expect(client.getFullUrl(endpoint)).toBe(expectedUrl);
        });
    });
});
