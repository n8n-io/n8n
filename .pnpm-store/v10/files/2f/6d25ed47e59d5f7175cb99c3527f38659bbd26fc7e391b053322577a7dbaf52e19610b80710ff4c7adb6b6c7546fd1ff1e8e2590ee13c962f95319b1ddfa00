/**
 * Interface that represents PDF data transport. If possible, it allows
 * progressively load entire or fragment of the PDF binary data.
 *
 * @interface
 */
export class IPDFStream {
    /**
     * Gets a reader for the entire PDF data.
     * @returns {IPDFStreamReader}
     */
    getFullReader(): IPDFStreamReader;
    /**
     * Gets a reader for the range of the PDF data.
     *
     * NOTE: Currently this method is only expected to be invoked *after*
     * the `IPDFStreamReader.prototype.headersReady` promise has resolved.
     *
     * @param {number} begin - the start offset of the data.
     * @param {number} end - the end offset of the data.
     * @returns {IPDFStreamRangeReader}
     */
    getRangeReader(begin: number, end: number): IPDFStreamRangeReader;
    /**
     * Cancels all opened reader and closes all their opened requests.
     * @param {Object} reason - the reason for cancelling
     */
    cancelAllRequests(reason: Object): void;
}
/**
 * Interface for a PDF binary data fragment reader.
 *
 * @interface
 */
export class IPDFStreamRangeReader {
    /**
     * Sets or gets the progress callback. The callback can be useful when the
     * isStreamingSupported property of the object is defined as false.
     * The callback is called with one parameter: an object with the loaded
     * property.
     */
    onProgress: any;
    /**
     * Gets ability of the stream to progressively load binary data.
     * @type {boolean}
     */
    get isStreamingSupported(): boolean;
    /**
     * Requests a chunk of the binary data. The method returns the promise, which
     * is resolved into object with properties "value" and "done". If the done
     * is set to true, then the stream has reached its end, otherwise the value
     * contains binary data. Cancelled requests will be resolved with the done is
     * set to true.
     * @returns {Promise}
     */
    read(): Promise<any>;
    /**
     * Cancels all pending read requests and closes the stream.
     * @param {Object} reason
     */
    cancel(reason: Object): void;
}
/**
 * Interface for a PDF binary data reader.
 *
 * @interface
 */
export class IPDFStreamReader {
    /**
     * Sets or gets the progress callback. The callback can be useful when the
     * isStreamingSupported property of the object is defined as false.
     * The callback is called with one parameter: an object with the loaded and
     * total properties.
     */
    onProgress: any;
    /**
     * Gets a promise that is resolved when the headers and other metadata of
     * the PDF data stream are available.
     * @type {Promise}
     */
    get headersReady(): Promise<any>;
    /**
     * Gets the Content-Disposition filename. It is defined after the headersReady
     * promise is resolved.
     * @type {string|null} The filename, or `null` if the Content-Disposition
     *                     header is missing/invalid.
     */
    get filename(): string | null;
    /**
     * Gets PDF binary data length. It is defined after the headersReady promise
     * is resolved.
     * @type {number} The data length (or 0 if unknown).
     */
    get contentLength(): number;
    /**
     * Gets ability of the stream to handle range requests. It is defined after
     * the headersReady promise is resolved. Rejected when the reader is cancelled
     * or an error occurs.
     * @type {boolean}
     */
    get isRangeSupported(): boolean;
    /**
     * Gets ability of the stream to progressively load binary data. It is defined
     * after the headersReady promise is resolved.
     * @type {boolean}
     */
    get isStreamingSupported(): boolean;
    /**
     * Requests a chunk of the binary data. The method returns the promise, which
     * is resolved into object with properties "value" and "done". If the done
     * is set to true, then the stream has reached its end, otherwise the value
     * contains binary data. Cancelled requests will be resolved with the done is
     * set to true.
     * @returns {Promise}
     */
    read(): Promise<any>;
    /**
     * Cancels all pending read requests and closes the stream.
     * @param {Object} reason
     */
    cancel(reason: Object): void;
}
