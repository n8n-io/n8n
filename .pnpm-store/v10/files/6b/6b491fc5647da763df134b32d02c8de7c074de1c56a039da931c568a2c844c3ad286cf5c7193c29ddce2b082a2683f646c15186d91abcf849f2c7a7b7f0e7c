import { createRequestUrl } from "../../../src/core/fetcher/createRequestUrl";

describe("Test createRequestUrl", () => {
    it("should return the base URL when no query parameters are provided", () => {
        const baseUrl = "https://api.example.com";
        expect(createRequestUrl(baseUrl)).toBe(baseUrl);
    });

    it("should append simple query parameters", () => {
        const baseUrl = "https://api.example.com";
        const queryParams = { key: "value", another: "param" };
        expect(createRequestUrl(baseUrl, queryParams)).toBe("https://api.example.com?key=value&another=param");
    });

    it("should handle array query parameters", () => {
        const baseUrl = "https://api.example.com";
        const queryParams = { items: ["a", "b", "c"] };
        expect(createRequestUrl(baseUrl, queryParams)).toBe("https://api.example.com?items=a&items=b&items=c");
    });

    it("should handle object query parameters", () => {
        const baseUrl = "https://api.example.com";
        const queryParams = { filter: { name: "John", age: 30 } };
        expect(createRequestUrl(baseUrl, queryParams)).toBe(
            "https://api.example.com?filter%5Bname%5D=John&filter%5Bage%5D=30"
        );
    });

    it("should handle mixed types of query parameters", () => {
        const baseUrl = "https://api.example.com";
        const queryParams = {
            simple: "value",
            array: ["x", "y"],
            object: { key: "value" },
        };
        expect(createRequestUrl(baseUrl, queryParams)).toBe(
            "https://api.example.com?simple=value&array=x&array=y&object%5Bkey%5D=value"
        );
    });

    it("should handle empty query parameters object", () => {
        const baseUrl = "https://api.example.com";
        expect(createRequestUrl(baseUrl, {})).toBe(baseUrl);
    });

    it("should encode special characters in query parameters", () => {
        const baseUrl = "https://api.example.com";
        const queryParams = { special: "a&b=c d" };
        expect(createRequestUrl(baseUrl, queryParams)).toBe("https://api.example.com?special=a%26b%3Dc%20d");
    });
});
