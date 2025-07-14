export type ChunkType = 'begin' | 'item' | 'end' | 'error' | 'rich-item';

export interface StructuredChunk {
	type: ChunkType;
	content?: string;
	richContent?: {
		html?: string;
		css?: string;
		script?: string;
		data?: Record<string, unknown>;
		components?: Array<{
			type: 'button' | 'form' | 'chart' | 'table' | 'image' | 'video' | 'iframe';
			id: string;
			props: Record<string, unknown>;
			events?: Record<string, string>;
			style?: Record<string, string>;
		}>;
		sanitize?: 'none' | 'basic' | 'strict';
	};
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
