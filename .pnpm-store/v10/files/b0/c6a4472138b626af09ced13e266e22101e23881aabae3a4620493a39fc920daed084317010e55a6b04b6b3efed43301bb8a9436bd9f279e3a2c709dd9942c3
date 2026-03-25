import { RUNTIME } from "../../../src/core/runtime";
import { makeRequest } from "../../../src/core/fetcher/makeRequest";

if (RUNTIME.type === "browser") {
    require("jest-fetch-mock").enableMocks();
}

describe("Test makeRequest", () => {
    const mockPostUrl = "https://httpbin.org/post";
    const mockGetUrl = "https://httpbin.org/get";
    const mockHeaders = { "Content-Type": "application/json" };
    const mockBody = JSON.stringify({ key: "value" });

    let mockFetch: jest.Mock;

    beforeEach(() => {
        mockFetch = jest.fn();
        mockFetch.mockResolvedValue(new Response(JSON.stringify({ test: "successful" }), { status: 200 }));
    });

    it("should handle POST request correctly", async () => {
        const response = await makeRequest(mockFetch, mockPostUrl, "POST", mockHeaders, mockBody);
        const responseBody = await response.json();
        expect(responseBody).toEqual({ test: "successful" });
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
        expect(calledUrl).toBe(mockPostUrl);
        expect(calledOptions).toEqual(
            expect.objectContaining({
                method: "POST",
                headers: mockHeaders,
                body: mockBody,
                credentials: undefined,
            })
        );
        expect(calledOptions.signal).toBeDefined();
        expect(calledOptions.signal).toBeInstanceOf(AbortSignal);
    });

    it("should handle GET request correctly", async () => {
        const response = await makeRequest(mockFetch, mockGetUrl, "GET", mockHeaders, undefined);
        const responseBody = await response.json();
        expect(responseBody).toEqual({ test: "successful" });
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
        expect(calledUrl).toBe(mockGetUrl);
        expect(calledOptions).toEqual(
            expect.objectContaining({
                method: "GET",
                headers: mockHeaders,
                body: undefined,
                credentials: undefined,
            })
        );
        expect(calledOptions.signal).toBeDefined();
        expect(calledOptions.signal).toBeInstanceOf(AbortSignal);
    });
});
