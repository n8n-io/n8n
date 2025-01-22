import type {
	Connection,
	Endpoint,
	EndpointRepresentation,
	AbstractConnector,
	Overlay,
} from '@jsplumb/core';
import type { NodeConnectionType } from 'n8n-workflow';
import type { N8nEndpointLabelLength } from '@/plugins/jsplumb/N8nPlusEndpointType';

declare module '@jsplumb/core' {
	interface EndpointRepresentation {
		canvas: HTMLElement;
		scope: NodeConnectionType;
	}
	interface AbstractConnector {
		canvas: HTMLElement;
		overrideTargetEndpoint: Endpoint;
	}
	interface Overlay {
		canvas: HTMLElement;
	}
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
			nodeType?: string;
			totalEndpoints: number;
			endpointLabelLength?: N8nEndpointLabelLength;
		};
	}
}
