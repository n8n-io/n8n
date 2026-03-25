export const isReadableStream = (stream) => typeof ReadableStream === "function" &&
    (stream?.constructor?.name === ReadableStream.name || stream instanceof ReadableStream);
export const isBlob = (blob) => {
    return typeof Blob === "function" && (blob?.constructor?.name === Blob.name || blob instanceof Blob);
};
