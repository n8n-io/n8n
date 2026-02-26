import { parentPort } from 'worker_threads';

interface WorkerMessage {
	queryVector: Float32Array;
	matrix: Float32Array; // flat row-major: [v0_f0..v0_fn, v1_f0..v1_fn, ...]
	vectorCount: number;
	k: number;
	taskId: string;
}

interface WorkerResult {
	indices: number[];
	scores: number[];
	taskId: string;
}

/**
 * Calculates cosine similarity between two vectors.
 * Assumes vectors are NOT pre-normalized.
 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}

	normA = Math.sqrt(normA);
	normB = Math.sqrt(normB);

	if (normA === 0 || normB === 0) {
		return 0;
	}

	return dotProduct / (normA * normB);
}

/**
 * Finds top-K similar vectors using a min-heap approach.
 * Accepts a flat row-major matrix to avoid allocating N individual Float32Arrays.
 * Uses subarray() views — no copying.
 */
function topKSimilar(
	queryVector: Float32Array,
	matrix: Float32Array,
	vectorCount: number,
	k: number,
): { indices: number[]; scores: number[] } {
	const dim = matrix.length / vectorCount;

	// For small datasets or when k is close to vector count, just sort everything
	if (k >= vectorCount * 0.5) {
		const results: Array<{ index: number; score: number }> = [];
		for (let i = 0; i < vectorCount; i++) {
			results.push({
				index: i,
				score: cosineSimilarity(queryVector, matrix.subarray(i * dim, (i + 1) * dim)),
			});
		}

		results.sort((a, b) => b.score - a.score);

		const topK = results.slice(0, k);
		return {
			indices: topK.map((r) => r.index),
			scores: topK.map((r) => r.score),
		};
	}

	// For larger datasets with small k, use min-heap approach
	// Store only top k results to save memory
	const heap: Array<{ index: number; score: number }> = [];

	for (let i = 0; i < vectorCount; i++) {
		const score = cosineSimilarity(queryVector, matrix.subarray(i * dim, (i + 1) * dim));

		if (heap.length < k) {
			heap.push({ index: i, score });
			if (heap.length === k) {
				// Convert to min-heap when full
				heap.sort((a, b) => a.score - b.score);
			}
		} else if (score > heap[0].score) {
			// Replace minimum if current score is higher
			heap[0] = { index: i, score };
			// Maintain min-heap property
			let pos = 0;
			while (true) {
				const left = 2 * pos + 1;
				const right = 2 * pos + 2;
				let smallest = pos;

				if (left < k && heap[left].score < heap[smallest].score) {
					smallest = left;
				}
				if (right < k && heap[right].score < heap[smallest].score) {
					smallest = right;
				}
				if (smallest === pos) {
					break;
				}

				[heap[pos], heap[smallest]] = [heap[smallest], heap[pos]];
				pos = smallest;
			}
		}
	}

	// Sort heap by score descending
	heap.sort((a, b) => b.score - a.score);

	return {
		indices: heap.map((r) => r.index),
		scores: heap.map((r) => r.score),
	};
}

// Listen for messages from main thread
if (parentPort) {
	parentPort.on('message', (message: WorkerMessage) => {
		try {
			const { queryVector, matrix, vectorCount, k, taskId } = message;

			// Perform computation
			const result = topKSimilar(queryVector, matrix, vectorCount, k);

			// Send result back
			const response: WorkerResult = {
				indices: result.indices,
				scores: result.scores,
				taskId,
			};

			parentPort!.postMessage(response);
		} catch (error) {
			// Send error back
			parentPort!.postMessage({
				error: error instanceof Error ? error.message : 'Unknown error',
				taskId: message.taskId,
			});
		}
	});
}
