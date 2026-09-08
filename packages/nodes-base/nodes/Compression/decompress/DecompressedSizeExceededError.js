import { UserError } from 'n8n-workflow';
export class DecompressedSizeExceededError extends UserError {
    constructor(maxOutputSize) {
        const limitMb = Math.round(maxOutputSize / (1024 * 1024));
        super(`The decompressed output exceeds the maximum allowed size of ${limitMb} MB`);
    }
}
//# sourceMappingURL=DecompressedSizeExceededError.js.map