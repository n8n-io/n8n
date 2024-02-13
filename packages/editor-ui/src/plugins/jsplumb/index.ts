import type { Plugin } from 'vue';
import { N8nPlusEndpointHandler } from '@/plugins/jsplumb/N8nPlusEndpointType';
import * as N8nPlusEndpointRenderer from '@/plugins/jsplumb/N8nPlusEndpointRenderer';
import { N8nConnector } from '@/plugins/connectors/N8nCustomConnector';
import * as N8nAddInputEndpointRenderer from '@/plugins/jsplumb/N8nAddInputEndpointRenderer';
import { N8nAddInputEndpointHandler } from '@/plugins/jsplumb/N8nAddInputEndpointType';
import { Connectors, EndpointFactory } from '@jsplumb/core';

export const JsPlumbPlugin: Plugin<{}> = {
	install: () => {
		Connectors.register(N8nConnector.type, N8nConnector);

		N8nPlusEndpointRenderer.register();
		EndpointFactory.registerHandler(N8nPlusEndpointHandler);

		N8nAddInputEndpointRenderer.register();
		EndpointFactory.registerHandler(N8nAddInputEndpointHandler);
	},
};
