import { stat as fsStat } from 'node:fs/promises';
import { fromStream as coreFromStream } from './core.js';
import { FileTokenizer } from "./FileTokenizer.js";
export { FileTokenizer } from './FileTokenizer.js';
export * from './core.js';
/**
 * Construct ReadStreamTokenizer from given Stream.
 * Will set fileSize, if provided given Stream has set the .path property.
 * @param stream - Node.js Stream.Readable
 * @param options - Pass additional file information to the tokenizer
 * @returns Tokenizer
 */
export async function fromStream(stream, options) {
    const rst = coreFromStream(stream, options);
    if (stream.path) {
        const stat = await fsStat(stream.path);
        rst.fileInfo.path = stream.path;
        rst.fileInfo.size = stat.size;
    }
    return rst;
}
export const fromFile = FileTokenizer.fromFile;
