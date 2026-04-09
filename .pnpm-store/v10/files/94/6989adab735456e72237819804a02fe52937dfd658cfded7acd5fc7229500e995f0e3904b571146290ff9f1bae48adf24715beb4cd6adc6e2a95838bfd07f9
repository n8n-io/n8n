const _chunkSize = 0x1000;
/**
 * Provides a consistent and easy to use internal API.
 * Default implementations for `exists` and `existsSync` are included.
 * If you are extending this class, note that every path is an absolute path and all arguments are present.
 * @category Internals
 * @internal
 */
export class FileSystem {
    constructor(
    /**
     * A unique ID for this kind of file system.
     * Currently unused internally, but could be used for partition tables or something
     */
    id, 
    /**
     * The name for this file system.
     * For example, tmpfs for an in memory one
     */
    name) {
        this.id = id;
        this.name = name;
        /**
         * @see FileSystemAttributes
         */
        this.attributes = new Map();
        if (this.streamRead === FileSystem.prototype.streamRead)
            this.attributes.set('default_stream_read');
        if (this.streamWrite === FileSystem.prototype.streamWrite)
            this.attributes.set('default_stream_write');
    }
    toString() {
        var _a;
        return `${this.name} ${(_a = this.label) !== null && _a !== void 0 ? _a : ''} (${this._mountPoint ? 'mounted on ' + this._mountPoint : 'unmounted'})`;
    }
    /**
     * Default implementation.
     * @todo Implement
     * @experimental
     */
    usage() {
        return {
            totalSpace: 0,
            freeSpace: 0,
        };
    }
    /* node:coverage disable */
    /**
     * Get metadata about the current file system
     * @deprecated
     */
    metadata() {
        return {
            ...this.usage(),
            name: this.name,
            readonly: this.attributes.has('no_write'),
            noResizableBuffers: this.attributes.has('no_buffer_resize'),
            noAsyncCache: this.attributes.has('no_async'),
            features: Array.from(this.attributes.keys()),
            type: this.id,
        };
    }
    /* node:coverage enable */
    async ready() { }
    /**
     * Test whether or not `path` exists.
     */
    async exists(path) {
        try {
            await this.stat(path);
            return true;
        }
        catch (e) {
            return e.code != 'ENOENT';
        }
    }
    /**
     * Test whether or not `path` exists.
     */
    existsSync(path) {
        try {
            this.statSync(path);
            return true;
        }
        catch (e) {
            return e.code != 'ENOENT';
        }
    }
    /**
     * Read a file using a stream.
     * @privateRemarks The default implementation of `streamRead` uses "chunked" `read`s
     */
    streamRead(path, options) {
        return new ReadableStream({
            start: async (controller) => {
                const { size } = await this.stat(path);
                const { start = 0, end = size } = options;
                for (let offset = start; offset < end; offset += _chunkSize) {
                    const bytesRead = offset + _chunkSize > end ? end - offset : _chunkSize;
                    const buffer = new Uint8Array(bytesRead);
                    await this.read(path, buffer, offset, offset + bytesRead).catch(controller.error.bind(controller));
                    controller.enqueue(buffer);
                }
                controller.close();
            },
            type: 'bytes',
        });
    }
    /**
     * Write a file using stream.
     * @privateRemarks The default implementation of `streamWrite` uses "chunked" `write`s
     */
    streamWrite(path, options) {
        var _a;
        let position = (_a = options.start) !== null && _a !== void 0 ? _a : 0;
        return new WritableStream({
            write: async (chunk, controller) => {
                await this.write(path, chunk, position).catch(controller.error.bind(controller));
                position += chunk.byteLength;
            },
        });
    }
}
