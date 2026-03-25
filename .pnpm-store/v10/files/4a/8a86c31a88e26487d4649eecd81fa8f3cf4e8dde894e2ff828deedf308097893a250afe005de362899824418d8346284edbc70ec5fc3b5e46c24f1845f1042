import { RUNTIME } from "../../../src/core/runtime";
import { getRequestBody } from "../../../src/core/fetcher/getRequestBody";

if (RUNTIME.type === "browser") {
    require("jest-fetch-mock").enableMocks();
}

describe("Test getRequestBody", () => {
    it("should return FormData as is in Node environment", async () => {
        if (RUNTIME.type === "node") {
            const formData = new (await import("formdata-node")).FormData();
            formData.append("key", "value");
            const result = await getRequestBody({
                body: formData,
                type: "file",
            });
            expect(result).toBe(formData);
        }
    });

    it("should stringify body if not FormData in Node environment", async () => {
        if (RUNTIME.type === "node") {
            const body = { key: "value" };
            const result = await getRequestBody({
                body,
                type: "json",
            });
            expect(result).toBe('{"key":"value"}');
        }
    });

    it("should return FormData in browser environment", async () => {
        if (RUNTIME.type === "browser") {
            const formData = new (await import("form-data")).default();
            formData.append("key", "value");
            const result = await getRequestBody({
                body: formData,
                type: "file",
            });
            expect(result).toBe(formData);
        }
    });

    it("should stringify body if not FormData in browser environment", async () => {
        if (RUNTIME.type === "browser") {
            const body = { key: "value" };
            const result = await getRequestBody({
                body,
                type: "json",
            });
            expect(result).toBe('{"key":"value"}');
        }
    });

    it("should return the Uint8Array", async () => {
        const input = new Uint8Array([1, 2, 3]);
        const result = await getRequestBody({
            body: input,
            type: "bytes",
        });
        expect(result).toBe(input);
    });

    it("should return the input for content-type 'application/x-www-form-urlencoded'", async () => {
        const input = "key=value&another=param";
        const result = await getRequestBody({
            body: input,
            type: "other",
        });
        expect(result).toBe(input);
    });

    it("should JSON stringify objects", async () => {
        const input = { key: "value" };
        const result = await getRequestBody({
            body: input,
            type: "json",
        });
        expect(result).toBe('{"key":"value"}');
    });
});
