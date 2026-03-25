import { Writable } from "stream";
export class Collector extends Writable {
    bufferedBytes = [];
    _write(chunk, encoding, callback) {
        this.bufferedBytes.push(chunk);
        callback();
    }
}
