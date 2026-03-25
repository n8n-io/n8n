export async function blobReader(blob, onChunk, chunkSize = 1024 * 1024) {
    const size = blob.size;
    let totalBytesRead = 0;
    while (totalBytesRead < size) {
        const slice = blob.slice(totalBytesRead, Math.min(size, totalBytesRead + chunkSize));
        onChunk(new Uint8Array(await slice.arrayBuffer()));
        totalBytesRead += slice.size;
    }
}
