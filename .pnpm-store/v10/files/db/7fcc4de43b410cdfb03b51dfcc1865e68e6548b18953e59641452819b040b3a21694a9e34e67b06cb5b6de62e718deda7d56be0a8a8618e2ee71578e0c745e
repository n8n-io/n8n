import { promisify } from 'util';
import { inflateRaw as inflateRawCb, deflateRaw as deflateRawCb } from 'zlib';
import { JWEDecompressionFailed } from '../util/errors.js';
const inflateRaw = promisify(inflateRawCb);
const deflateRaw = promisify(deflateRawCb);
export const inflate = (input) => inflateRaw(input, { maxOutputLength: 250000 }).catch(() => {
    throw new JWEDecompressionFailed();
});
export const deflate = (input) => deflateRaw(input);
