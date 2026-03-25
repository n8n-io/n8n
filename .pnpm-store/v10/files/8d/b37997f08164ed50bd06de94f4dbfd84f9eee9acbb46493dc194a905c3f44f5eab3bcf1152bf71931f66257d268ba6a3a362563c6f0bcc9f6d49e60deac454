import { NodePre18StreamWrapper } from "../../../../src/core/fetcher/stream-wrappers/NodePre18StreamWrapper";

describe("NodePre18StreamWrapper", () => {
    it("should set encoding to utf-8", async () => {
        const rawStream = (await import("stream")).Readable.from(["test", "test"]);
        const stream = new NodePre18StreamWrapper(rawStream);
        const setEncodingSpy = jest.spyOn(stream, "setEncoding");

        stream.setEncoding("utf-8");

        expect(setEncodingSpy).toHaveBeenCalledWith("utf-8");
    });

    it("should register an event listener for readable", async () => {
        const rawStream = (await import("stream")).Readable.from(["test", "test"]);
        const stream = new NodePre18StreamWrapper(rawStream);
        const onSpy = jest.spyOn(stream, "on");

        stream.on("readable", () => {});

        expect(onSpy).toHaveBeenCalledWith("readable", expect.any(Function));
    });

    it("should remove an event listener for data", async () => {
        const rawStream = (await import("stream")).Readable.from(["test", "test"]);
        const stream = new NodePre18StreamWrapper(rawStream);
        const offSpy = jest.spyOn(stream, "off");

        const fn = () => {};
        stream.on("data", fn);
        stream.off("data", fn);

        expect(offSpy).toHaveBeenCalledWith("data", expect.any(Function));
    });

    it("should write to dest when calling pipe to node writable stream", async () => {
        const rawStream = (await import("stream")).Readable.from(["test", "test"]);
        const stream = new NodePre18StreamWrapper(rawStream);
        const dest = new (await import("stream")).Writable({
            write(chunk, encoding, callback) {
                expect(chunk.toString()).toEqual("test");
                callback();
            },
        });

        stream.pipe(dest);
    });

    it("should write nothing when calling pipe and unpipe", async () => {
        const rawStream = (await import("stream")).Readable.from(["test", "test"]);
        const stream = new NodePre18StreamWrapper(rawStream);
        const buffer: Uint8Array[] = [];
        const dest = new (await import("stream")).Writable({
            write(chunk, encoding, callback) {
                buffer.push(chunk);
                callback();
            },
        });
        stream.pipe(dest);
        stream.unpipe();

        expect(buffer).toEqual([]);
    });

    it("should destroy the stream", async () => {
        const rawStream = (await import("stream")).Readable.from(["test", "test"]);
        const stream = new NodePre18StreamWrapper(rawStream);
        const destroySpy = jest.spyOn(stream, "destroy");

        stream.destroy();

        expect(destroySpy).toHaveBeenCalledWith();
    });

    it("should pause the stream and resume", async () => {
        const rawStream = (await import("stream")).Readable.from(["test", "test"]);
        const stream = new NodePre18StreamWrapper(rawStream);
        const pauseSpy = jest.spyOn(stream, "pause");

        stream.pause();
        expect(stream.isPaused).toBe(true);
        stream.resume();
        expect(stream.isPaused).toBe(false);

        expect(pauseSpy).toHaveBeenCalledWith();
    });

    it("should read the stream", async () => {
        const rawStream = (await import("stream")).Readable.from(["test", "test"]);
        const stream = new NodePre18StreamWrapper(rawStream);

        expect(await stream.read()).toEqual("test");
        expect(await stream.read()).toEqual("test");
    });

    it("should read the stream as text", async () => {
        const rawStream = (await import("stream")).Readable.from(["test", "test"]);
        const stream = new NodePre18StreamWrapper(rawStream);

        const data = await stream.text();

        expect(data).toEqual("testtest");
    });

    it("should read the stream as json", async () => {
        const rawStream = (await import("stream")).Readable.from([JSON.stringify({ test: "test" })]);
        const stream = new NodePre18StreamWrapper(rawStream);

        const data = await stream.json();

        expect(data).toEqual({ test: "test" });
    });

    it("should allow use with async iteratable stream", async () => {
        const rawStream = (await import("stream")).Readable.from(["test", "test"]);
        let data = "";
        const stream = new NodePre18StreamWrapper(rawStream);
        for await (const chunk of stream) {
            data += chunk;
        }

        expect(data).toEqual("testtest");
    });
});
