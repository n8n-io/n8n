import { RUNTIME } from "../../../src/core/runtime";
import { requestWithRetries } from "../../../src/core/fetcher/requestWithRetries";

if (RUNTIME.type === "browser") {
    require("jest-fetch-mock").enableMocks();
}

describe("Test exponential backoff", () => {
    let mockFetch: jest.Mock;
    let originalSetTimeout: typeof setTimeout;

    beforeEach(() => {
        mockFetch = jest.fn();
        originalSetTimeout = global.setTimeout;
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        global.setTimeout = originalSetTimeout;
    });

    it("should retry on 408, 409, 429, 500+", async () => {
        mockFetch
            .mockResolvedValueOnce(new Response("", { status: 408 }))
            .mockResolvedValueOnce(new Response("", { status: 409 }))
            .mockResolvedValueOnce(new Response("", { status: 429 }))
            .mockResolvedValueOnce(new Response("", { status: 500 }))
            .mockResolvedValueOnce(new Response("", { status: 502 }))
            .mockResolvedValueOnce(new Response("", { status: 200 }))
            .mockResolvedValueOnce(new Response("", { status: 408 }));

        const responsePromise = requestWithRetries(() => mockFetch(), 10);

        await jest.advanceTimersByTimeAsync(10000);
        const response = await responsePromise;

        expect(mockFetch).toHaveBeenCalledTimes(6);
        expect(response.status).toBe(200);
    });

    it("should retry max 3 times", async () => {
        mockFetch
            .mockResolvedValueOnce(new Response("", { status: 408 }))
            .mockResolvedValueOnce(new Response("", { status: 409 }))
            .mockResolvedValueOnce(new Response("", { status: 429 }))
            .mockResolvedValueOnce(new Response("", { status: 429 }));

        const responsePromise = requestWithRetries(() => mockFetch(), 3);

        await jest.advanceTimersByTimeAsync(10000);
        const response = await responsePromise;

        expect(mockFetch).toHaveBeenCalledTimes(4);
        expect(response.status).toBe(429);
    });
    it("should not retry on 200", async () => {
        mockFetch
            .mockResolvedValueOnce(new Response("", { status: 200 }))
            .mockResolvedValueOnce(new Response("", { status: 409 }));

        const responsePromise = requestWithRetries(() => mockFetch(), 3);

        await jest.advanceTimersByTimeAsync(10000);
        const response = await responsePromise;

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(response.status).toBe(200);
    });

    it("should retry with exponential backoff timing", async () => {
        mockFetch.mockResolvedValue(new Response("", { status: 500 }));
        const maxRetries = 7;
        const responsePromise = requestWithRetries(() => mockFetch(), maxRetries);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        const delays = [1, 2, 4, 8, 16, 32, 64];
        for (let i = 0; i < delays.length; i++) {
            await jest.advanceTimersByTimeAsync(delays[i] as number);
            expect(mockFetch).toHaveBeenCalledTimes(Math.min(i + 2, maxRetries + 1));
        }
        const response = await responsePromise;
        expect(response.status).toBe(500);
    });
});
