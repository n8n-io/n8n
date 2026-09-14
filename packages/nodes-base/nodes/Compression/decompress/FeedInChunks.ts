const CHUNK_SIZE = 65_536; // 64 KB

/** Feeds a buffer to a consumer in fixed-size slices. */
export function feedInChunks(options: {
	data: Buffer;
	push: (slice: Uint8Array, isFinal: boolean) => void;
	shouldStop: () => boolean;
}): void {
	const { data, push, shouldStop } = options;
	if (data.length === 0) {
		if (!shouldStop()) push(data, true);
		return;
	}

	for (let offset = 0; offset < data.length && !shouldStop(); offset += CHUNK_SIZE) {
		const end = Math.min(offset + CHUNK_SIZE, data.length);
		push(data.subarray(offset, end), end === data.length);
	}
}
