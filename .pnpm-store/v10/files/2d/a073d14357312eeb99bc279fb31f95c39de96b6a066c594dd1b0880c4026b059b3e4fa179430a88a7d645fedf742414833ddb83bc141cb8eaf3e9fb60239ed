export class GzipHandler {
    constructor(tokenizer) {
        this.tokenizer = tokenizer;
    }
    inflate() {
        const tokenizer = this.tokenizer;
        return new ReadableStream({
            async pull(controller) {
                const buffer = new Uint8Array(1024);
                const size = await tokenizer.readBuffer(buffer, { mayBeLess: true });
                if (size === 0) {
                    controller.close();
                    return;
                }
                controller.enqueue(buffer.subarray(0, size));
            }
        }).pipeThrough(new DecompressionStream("gzip"));
    }
}
