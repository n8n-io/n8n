import { RUNTIME } from "../../../src/core/runtime";
import { getFetchFn } from "../../../src/core/fetcher/getFetchFn";

describe("Test for getFetchFn", () => {
    it("should get node-fetch function", async () => {
        if (RUNTIME.type == "node") {
            if (RUNTIME.parsedVersion != null && RUNTIME.parsedVersion >= 18) {
                expect(await getFetchFn()).toBe(fetch);
            } else {
                expect(await getFetchFn()).toEqual((await import("node-fetch")).default as any);
            }
        }
    });

    it("should get fetch function", async () => {
        if (RUNTIME.type == "browser") {
            const fetchFn = await getFetchFn();
            expect(typeof fetchFn).toBe("function");
            expect(fetchFn.name).toBe("fetch");
        }
    });
});
