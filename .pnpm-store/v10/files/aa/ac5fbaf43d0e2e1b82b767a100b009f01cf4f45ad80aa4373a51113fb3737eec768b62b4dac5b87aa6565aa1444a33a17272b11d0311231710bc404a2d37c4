"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomIdGenerator = void 0;
const SPAN_ID_BYTES = 8;
const TRACE_ID_BYTES = 16;
/**
 * @deprecated Use the one defined in @opentelemetry/sdk-trace-base instead.
 */
class RandomIdGenerator {
    constructor() {
        /**
         * Returns a random 16-byte trace ID formatted/encoded as a 32 lowercase hex
         * characters corresponding to 128 bits.
         */
        this.generateTraceId = getIdGenerator(TRACE_ID_BYTES);
        /**
         * Returns a random 8-byte span ID formatted/encoded as a 16 lowercase hex
         * characters corresponding to 64 bits.
         */
        this.generateSpanId = getIdGenerator(SPAN_ID_BYTES);
    }
}
exports.RandomIdGenerator = RandomIdGenerator;
const SHARED_CHAR_CODES_ARRAY = Array(32);
function getIdGenerator(bytes) {
    return function generateId() {
        for (let i = 0; i < bytes * 2; i++) {
            SHARED_CHAR_CODES_ARRAY[i] = Math.floor(Math.random() * 16) + 48;
            // valid hex characters in the range 48-57 and 97-102
            if (SHARED_CHAR_CODES_ARRAY[i] >= 58) {
                SHARED_CHAR_CODES_ARRAY[i] += 39;
            }
        }
        return String.fromCharCode.apply(null, SHARED_CHAR_CODES_ARRAY.slice(0, bytes * 2));
    };
}
//# sourceMappingURL=RandomIdGenerator.js.map