import { RUNTIME } from "../../../../src/core/runtime";
import { chooseStreamWrapper } from "../../../../src/core/fetcher/stream-wrappers/chooseStreamWrapper";
import { Node18UniversalStreamWrapper } from "../../../../src/core/fetcher/stream-wrappers/Node18UniversalStreamWrapper";
import { NodePre18StreamWrapper } from "../../../../src/core/fetcher/stream-wrappers/NodePre18StreamWrapper";
import { UndiciStreamWrapper } from "../../../../src/core/fetcher/stream-wrappers/UndiciStreamWrapper";

describe("chooseStreamWrapper", () => {
    beforeEach(() => {
        RUNTIME.type = "unknown";
        RUNTIME.parsedVersion = 0;
    });

    it('should return a Node18UniversalStreamWrapper when RUNTIME.type is "node" and RUNTIME.parsedVersion is not null and RUNTIME.parsedVersion is greater than or equal to 18', async () => {
        const expected = new Node18UniversalStreamWrapper(new ReadableStream());
        RUNTIME.type = "node";
        RUNTIME.parsedVersion = 18;

        const result = await chooseStreamWrapper(new ReadableStream());

        expect(JSON.stringify(result)).toBe(JSON.stringify(expected));
    });

    it('should return a NodePre18StreamWrapper when RUNTIME.type is "node" and RUNTIME.parsedVersion is not null and RUNTIME.parsedVersion is less than 18', async () => {
        const stream = await import("stream");
        const expected = new NodePre18StreamWrapper(new stream.Readable());

        RUNTIME.type = "node";
        RUNTIME.parsedVersion = 16;

        const result = await chooseStreamWrapper(new stream.Readable());

        expect(JSON.stringify(result)).toEqual(JSON.stringify(expected));
    });

    it('should return a Undici when RUNTIME.type is not "node"', async () => {
        const expected = new UndiciStreamWrapper(new ReadableStream());
        RUNTIME.type = "browser";

        const result = await chooseStreamWrapper(new ReadableStream());

        expect(JSON.stringify(result)).toEqual(JSON.stringify(expected));
    });
});
