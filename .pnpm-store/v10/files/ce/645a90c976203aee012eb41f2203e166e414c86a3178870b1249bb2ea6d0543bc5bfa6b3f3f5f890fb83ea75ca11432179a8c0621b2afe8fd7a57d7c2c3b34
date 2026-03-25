"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_loader_1 = require("../config-loader");
var path_1 = require("path");
describe("config-loader", function () {
    it("should use explicitParams when set", function () {
        var result = (0, config_loader_1.configLoader)({
            explicitParams: {
                baseUrl: "/foo/bar",
                paths: {
                    asd: ["asd"],
                },
            },
            cwd: "/baz",
        });
        var successResult = result;
        expect(successResult.resultType).toBe("success");
        expect(successResult.absoluteBaseUrl).toBe("/foo/bar");
        expect(successResult.paths["asd"][0]).toBe("asd");
    });
    it("should use explicitParams when set and add cwd when path is relative", function () {
        var result = (0, config_loader_1.configLoader)({
            explicitParams: {
                baseUrl: "bar/",
                paths: {
                    asd: ["asd"],
                },
            },
            cwd: "/baz",
        });
        var successResult = result;
        expect(successResult.resultType).toBe("success");
        expect(successResult.absoluteBaseUrl).toBe((0, path_1.join)("/baz", "bar/"));
    });
    it("should fallback to tsConfigLoader when explicitParams is not set", function () {
        var result = (0, config_loader_1.configLoader)({
            explicitParams: undefined,
            cwd: "/baz",
            tsConfigLoader: function () { return ({
                tsConfigPath: "/baz/tsconfig.json",
                baseUrl: "./src",
                paths: {},
            }); },
        });
        var successResult = result;
        expect(successResult.resultType).toBe("success");
        expect(successResult.absoluteBaseUrl).toBe((0, path_1.join)("/baz", "src"));
    });
    it("should tolerate a missing baseUrl", function () {
        var result = (0, config_loader_1.configLoader)({
            explicitParams: undefined,
            cwd: "/baz",
            tsConfigLoader: function () { return ({
                tsConfigPath: "/baz/tsconfig.json",
                baseUrl: undefined,
                paths: {},
            }); },
        });
        var failResult = result;
        expect(failResult.resultType).toBe("success");
    });
    it("should presume cwd to be a tsconfig file when loadConfig is called with absolute path to tsconfig.json", function () {
        // using tsconfig-named.json to ensure that future changes to fix
        // https://github.com/dividab/tsconfig-paths/issues/31
        // do not pass this test case just because of a directory walk looking
        // for tsconfig.json
        var configFile = (0, path_1.join)(__dirname, "tsconfig-named.json");
        var result = (0, config_loader_1.loadConfig)(configFile);
        var successResult = result;
        expect(successResult.resultType).toBe("success");
        expect(successResult.configFileAbsolutePath).toBe(configFile);
    });
    it("should allow an absolute baseUrl in tsconfig.json", function () {
        var result = (0, config_loader_1.configLoader)({
            explicitParams: undefined,
            cwd: "/baz",
            tsConfigLoader: function () { return ({
                tsConfigPath: "/baz/tsconfig.json",
                baseUrl: "/baz",
                paths: {},
            }); },
        });
        var successResult = result;
        expect(successResult.absoluteBaseUrl).toEqual("/baz");
    });
});
//# sourceMappingURL=config-loader.test.js.map