export type ChunkType = 'begin' | 'item' | 'end' | 'error';
export interface StructuredChunk {
	type: ChunkType;
	content?: string;
	metadata: {
		nodeId: string;
		nodeName: string;
		timestamp: number;
		runIndex: number;
		itemIndex: number;
	};
}

export interface NodeStreamingState {
	nodeId: string;
	chunks: string[];
	isActive: boolean;
	startTime: number;
}
