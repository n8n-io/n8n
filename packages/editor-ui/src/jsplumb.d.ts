import type { Connection, Endpoint } from '@jsplumb/core';
import { NodeConnectionType } from 'n8n-workflow';

declare module '@jsplumb/core' {
	interface Connection {
		__meta: {
			sourceOutputIndex: number;
			targetNodeName: string;
			targetOutputIndex: number;
			sourceNodeName: string;
		};
	}

	interface Endpoint {
		scope: NodeConnectionType;
		__meta: {
			nodeName: string;
			nodeId: string;
			index: number;
			totalEndpoints: number;
			endpointLabelLength: number;
		};
	};
}
