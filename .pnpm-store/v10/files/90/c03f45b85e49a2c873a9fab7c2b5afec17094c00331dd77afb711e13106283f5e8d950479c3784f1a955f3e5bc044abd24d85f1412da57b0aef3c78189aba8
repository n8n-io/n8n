"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var import_vitest = require("vitest");
var import_token_util = require("./token-util");
var authConfig = __toESM(require("./auth-config"));
var oauth = __toESM(require("./oauth"));
import_vitest.vi.mock("fs");
import_vitest.vi.mock("./token-io", () => ({
  getUserDataDir: import_vitest.vi.fn(() => "/mock/user/data"),
  findRootDir: import_vitest.vi.fn(() => "/mock/root")
}));
(0, import_vitest.describe)("getVercelCliToken", () => {
  (0, import_vitest.beforeEach)(() => {
    import_vitest.vi.clearAllMocks();
  });
  (0, import_vitest.afterEach)(() => {
    import_vitest.vi.restoreAllMocks();
  });
  (0, import_vitest.it)("should return token if valid and not expired", async () => {
    const validToken = {
      token: "valid-access-token",
      refreshToken: "refresh-token",
      expiresAt: Math.floor(Date.now() / 1e3) + 3600
      // expires in 1 hour
    };
    import_vitest.vi.spyOn(authConfig, "readAuthConfig").mockReturnValue(validToken);
    import_vitest.vi.spyOn(authConfig, "writeAuthConfig").mockImplementation(() => {
    });
    const token = await (0, import_token_util.getVercelCliToken)();
    (0, import_vitest.expect)(token).toBe("valid-access-token");
    (0, import_vitest.expect)(authConfig.writeAuthConfig).not.toHaveBeenCalled();
  });
  (0, import_vitest.it)("should return null if auth config does not exist", async () => {
    import_vitest.vi.spyOn(authConfig, "readAuthConfig").mockReturnValue(null);
    const token = await (0, import_token_util.getVercelCliToken)();
    (0, import_vitest.expect)(token).toBeNull();
  });
  (0, import_vitest.it)("should refresh token if expired and refresh token exists", async () => {
    const expiredToken = {
      token: "expired-access-token",
      refreshToken: "valid-refresh-token",
      expiresAt: Math.floor(Date.now() / 1e3) - 3600
      // expired 1 hour ago
    };
    const mockResponse = {
      ok: true,
      json: async () => ({
        access_token: "new-access-token",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "new-refresh-token"
      })
    };
    import_vitest.vi.spyOn(authConfig, "readAuthConfig").mockReturnValue(expiredToken);
    import_vitest.vi.spyOn(authConfig, "writeAuthConfig").mockImplementation(() => {
    });
    import_vitest.vi.spyOn(oauth, "refreshTokenRequest").mockResolvedValue(mockResponse);
    const token = await (0, import_token_util.getVercelCliToken)();
    (0, import_vitest.expect)(token).toBe("new-access-token");
    (0, import_vitest.expect)(oauth.refreshTokenRequest).toHaveBeenCalledWith({
      refresh_token: "valid-refresh-token"
    });
    (0, import_vitest.expect)(authConfig.writeAuthConfig).toHaveBeenCalledWith(
      import_vitest.expect.objectContaining({
        token: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresAt: import_vitest.expect.any(Number)
      })
    );
  });
  (0, import_vitest.it)("should clear auth and return null if token expired and no refresh token", async () => {
    const expiredTokenNoRefresh = {
      token: "expired-access-token",
      expiresAt: Math.floor(Date.now() / 1e3) - 3600
    };
    import_vitest.vi.spyOn(authConfig, "readAuthConfig").mockReturnValue(
      expiredTokenNoRefresh
    );
    import_vitest.vi.spyOn(authConfig, "writeAuthConfig").mockImplementation(() => {
    });
    const token = await (0, import_token_util.getVercelCliToken)();
    (0, import_vitest.expect)(token).toBeNull();
    (0, import_vitest.expect)(authConfig.writeAuthConfig).toHaveBeenCalledWith({});
  });
  (0, import_vitest.it)("should clear auth if refresh fails with OAuth error", async () => {
    const expiredToken = {
      token: "expired-access-token",
      refreshToken: "invalid-refresh-token",
      expiresAt: Math.floor(Date.now() / 1e3) - 3600
    };
    const mockErrorResponse = {
      ok: false,
      json: async () => ({
        error: "invalid_grant",
        error_description: "Refresh token expired"
      })
    };
    import_vitest.vi.spyOn(authConfig, "readAuthConfig").mockReturnValue(expiredToken);
    import_vitest.vi.spyOn(authConfig, "writeAuthConfig").mockImplementation(() => {
    });
    import_vitest.vi.spyOn(oauth, "refreshTokenRequest").mockResolvedValue(mockErrorResponse);
    const token = await (0, import_token_util.getVercelCliToken)();
    (0, import_vitest.expect)(token).toBeNull();
    (0, import_vitest.expect)(authConfig.writeAuthConfig).toHaveBeenCalledWith({});
  });
  (0, import_vitest.it)("should clear auth if refresh fails with network error", async () => {
    const expiredToken = {
      token: "expired-access-token",
      refreshToken: "valid-refresh-token",
      expiresAt: Math.floor(Date.now() / 1e3) - 3600
    };
    import_vitest.vi.spyOn(authConfig, "readAuthConfig").mockReturnValue(expiredToken);
    import_vitest.vi.spyOn(authConfig, "writeAuthConfig").mockImplementation(() => {
    });
    import_vitest.vi.spyOn(oauth, "refreshTokenRequest").mockRejectedValue(
      new Error("Network error")
    );
    const token = await (0, import_token_util.getVercelCliToken)();
    (0, import_vitest.expect)(token).toBeNull();
    (0, import_vitest.expect)(authConfig.writeAuthConfig).toHaveBeenCalledWith({});
  });
  (0, import_vitest.it)("should treat token as valid if expiresAt is missing (--token case)", async () => {
    const tokenWithoutExpiry = {
      token: "cli-provided-token"
    };
    import_vitest.vi.spyOn(authConfig, "readAuthConfig").mockReturnValue(tokenWithoutExpiry);
    import_vitest.vi.spyOn(authConfig, "writeAuthConfig").mockImplementation(() => {
    });
    const token = await (0, import_token_util.getVercelCliToken)();
    (0, import_vitest.expect)(token).toBe("cli-provided-token");
    (0, import_vitest.expect)(authConfig.writeAuthConfig).not.toHaveBeenCalled();
  });
  (0, import_vitest.it)("should preserve new refresh token if provided in response", async () => {
    const expiredToken = {
      token: "expired-access-token",
      refreshToken: "old-refresh-token",
      expiresAt: Math.floor(Date.now() / 1e3) - 3600
    };
    const mockResponse = {
      ok: true,
      json: async () => ({
        access_token: "new-access-token",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "new-refresh-token"
      })
    };
    import_vitest.vi.spyOn(authConfig, "readAuthConfig").mockReturnValue(expiredToken);
    import_vitest.vi.spyOn(authConfig, "writeAuthConfig").mockImplementation(() => {
    });
    import_vitest.vi.spyOn(oauth, "refreshTokenRequest").mockResolvedValue(mockResponse);
    await (0, import_token_util.getVercelCliToken)();
    (0, import_vitest.expect)(authConfig.writeAuthConfig).toHaveBeenCalledWith(
      import_vitest.expect.objectContaining({
        refreshToken: "new-refresh-token"
      })
    );
  });
  (0, import_vitest.it)("should not overwrite refresh token if not provided in response", async () => {
    const expiredToken = {
      token: "expired-access-token",
      refreshToken: "existing-refresh-token",
      expiresAt: Math.floor(Date.now() / 1e3) - 3600
    };
    const mockResponse = {
      ok: true,
      json: async () => ({
        access_token: "new-access-token",
        token_type: "Bearer",
        expires_in: 3600
        // No refresh_token in response
      })
    };
    import_vitest.vi.spyOn(authConfig, "readAuthConfig").mockReturnValue(expiredToken);
    import_vitest.vi.spyOn(authConfig, "writeAuthConfig").mockImplementation(() => {
    });
    import_vitest.vi.spyOn(oauth, "refreshTokenRequest").mockResolvedValue(mockResponse);
    await (0, import_token_util.getVercelCliToken)();
    const writeCall = import_vitest.vi.mocked(authConfig.writeAuthConfig).mock.calls[0][0];
    (0, import_vitest.expect)(writeCall).not.toHaveProperty("refreshToken");
  });
  (0, import_vitest.it)("should calculate expiresAt correctly from expires_in", async () => {
    const expiredToken = {
      token: "expired-access-token",
      refreshToken: "valid-refresh-token",
      expiresAt: Math.floor(Date.now() / 1e3) - 3600
    };
    const mockResponse = {
      ok: true,
      json: async () => ({
        access_token: "new-access-token",
        token_type: "Bearer",
        expires_in: 7200
        // 2 hours
      })
    };
    import_vitest.vi.spyOn(authConfig, "readAuthConfig").mockReturnValue(expiredToken);
    import_vitest.vi.spyOn(authConfig, "writeAuthConfig").mockImplementation(() => {
    });
    import_vitest.vi.spyOn(oauth, "refreshTokenRequest").mockResolvedValue(mockResponse);
    const beforeCall = Math.floor(Date.now() / 1e3);
    await (0, import_token_util.getVercelCliToken)();
    const afterCall = Math.floor(Date.now() / 1e3);
    const writeCall = import_vitest.vi.mocked(authConfig.writeAuthConfig).mock.calls[0][0];
    (0, import_vitest.expect)(writeCall.expiresAt).toBeGreaterThanOrEqual(beforeCall + 7200);
    (0, import_vitest.expect)(writeCall.expiresAt).toBeLessThanOrEqual(afterCall + 7200);
  });
});
