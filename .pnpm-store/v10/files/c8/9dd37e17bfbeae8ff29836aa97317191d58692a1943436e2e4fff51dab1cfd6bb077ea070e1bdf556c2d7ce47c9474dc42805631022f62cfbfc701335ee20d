import { BearerToken } from "../../../src/core/auth/BearerToken";

describe("BearerToken", () => {
    describe("toAuthorizationHeader", () => {
        it("correctly converts to header", () => {
            expect(BearerToken.toAuthorizationHeader("my-token")).toBe("Bearer my-token");
        });
    });
    describe("fromAuthorizationHeader", () => {
        it("correctly parses header", () => {
            expect(BearerToken.fromAuthorizationHeader("Bearer my-token")).toBe("my-token");
        });
    });
});
