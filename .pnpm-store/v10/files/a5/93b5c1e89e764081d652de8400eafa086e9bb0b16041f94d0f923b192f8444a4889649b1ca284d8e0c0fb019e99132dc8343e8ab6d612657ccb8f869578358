export const defaultMessages = 'End-Of-Stream';
/**
 * Thrown on read operation of the end of file or stream has been reached
 */
export class EndOfStreamError extends Error {
    constructor() {
        super(defaultMessages);
        this.name = "EndOfStreamError";
    }
}
export class AbortError extends Error {
    constructor(message = "The operation was aborted") {
        super(message);
        this.name = "AbortError";
    }
}
