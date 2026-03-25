import { blobReader } from "@smithy/chunked-blob-reader";
export const blobHasher = async function blobHasher(hashCtor, blob) {
    const hash = new hashCtor();
    await blobReader(blob, (chunk) => {
        hash.update(chunk);
    });
    return hash.digest();
};
