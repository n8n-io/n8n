import {
  configLoader,
  loadConfig,
  ConfigLoaderFailResult,
  ConfigLoaderSuccessResult,
} from "../config-loader";
import { join } from "path";

describe("config-loader", (): void => {
  it("should use explicitParams when set", () => {
    const result = configLoader({
      explicitParams: {
        baseUrl: "/foo/bar",
        paths: {
          asd: ["asd"],
        },
      },
      cwd: "/baz",
    });

    const successResult = result as ConfigLoaderSuccessResult;
    expect(successResult.resultType).toBe("success");
    expect(successResult.absoluteBaseUrl).toBe("/foo/bar");
    expect(successResult.paths["asd"][0]).toBe("asd");
  });

  it("should use explicitParams when set and add cwd when path is relative", () => {
    const result = configLoader({
      explicitParams: {
        baseUrl: "bar/",
        paths: {
          asd: ["asd"],
        },
      },
      cwd: "/baz",
    });

    const successResult = result as ConfigLoaderSuccessResult;
    expect(successResult.resultType).toBe("success");
    expect(successResult.absoluteBaseUrl).toBe(join("/baz", "bar/"));
  });

  it("should fallback to tsConfigLoader when explicitParams is not set", () => {
    const result = configLoader({
      explicitParams: undefined,
      cwd: "/baz",
      tsConfigLoader: () => ({
        tsConfigPath: "/baz/tsconfig.json",
        baseUrl: "./src",
        paths: {},
      }),
    });

    const successResult = result as ConfigLoaderSuccessResult;
    expect(successResult.resultType).toBe("success");
    expect(successResult.absoluteBaseUrl).toBe(join("/baz", "src"));
  });

  it("should tolerate a missing baseUrl", () => {
    const result = configLoader({
      explicitParams: undefined,
      cwd: "/baz",
      tsConfigLoader: () => ({
        tsConfigPath: "/baz/tsconfig.json",
        baseUrl: undefined,
        paths: {},
      }),
    });

    const failResult = result as ConfigLoaderFailResult;
    expect(failResult.resultType).toBe("success");
  });

  it("should presume cwd to be a tsconfig file when loadConfig is called with absolute path to tsconfig.json", () => {
    // using tsconfig-named.json to ensure that future changes to fix
    // https://github.com/dividab/tsconfig-paths/issues/31
    // do not pass this test case just because of a directory walk looking
    // for tsconfig.json
    const configFile = join(__dirname, "tsconfig-named.json");
    const result = loadConfig(configFile);

    const successResult = result as ConfigLoaderSuccessResult;
    expect(successResult.resultType).toBe("success");
    expect(successResult.configFileAbsolutePath).toBe(configFile);
  });

  it("should allow an absolute baseUrl in tsconfig.json", () => {
    const result = configLoader({
      explicitParams: undefined,
      cwd: "/baz",
      tsConfigLoader: () => ({
        tsConfigPath: "/baz/tsconfig.json",
        baseUrl: "/baz",
        paths: {},
      }),
    });

    const successResult = result as ConfigLoaderSuccessResult;
    expect(successResult.absoluteBaseUrl).toEqual("/baz");
  });
});
