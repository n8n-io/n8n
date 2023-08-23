import type { EndpointHandler, Endpoint, Overlay } from '@jsplumb/core';
import { EndpointRepresentation } from '@jsplumb/core';
import type { AnchorPlacement, EndpointRepresentationParams } from '@jsplumb/common';
import { EVENT_ENDPOINT_CLICK } from '@jsplumb/browser-ui';

export type ComputedN8nAddInputEndpoint = [number, number, number, number, number];
interface N8nAddInputEndpointParams extends EndpointRepresentationParams {
	endpoint: Endpoint;
	size: number;
}
export const N8nAddInputEndpointType = 'N8nAddInput';
export const EVENT_ADD_INPUT_ENDPOINT_CLICK = 'eventAddInputEndpointClick';
export class N8nAddInputEndpoint extends EndpointRepresentation<ComputedN8nAddInputEndpoint> {
	params: N8nAddInputEndpointParams;

	constructor(endpoint: Endpoint, params: N8nAddInputEndpointParams) {
		super(endpoint, params);

		this.params = params;
		this.params.size = params.size || 24;

		this.unbindEvents();
		this.bindEvents();
	}

	static type = N8nAddInputEndpointType;
	type = N8nAddInputEndpoint.type;

	setupOverlays() {
		this.endpoint.instance.setSuspendDrawing(true);
		this.endpoint.instance.setSuspendDrawing(false);
	}
	bindEvents() {
		this.instance.bind(EVENT_ENDPOINT_CLICK, this.fireClickEvent);
	}
	unbindEvents() {
		this.instance.unbind(EVENT_ENDPOINT_CLICK, this.fireClickEvent);
	}
	fireClickEvent = (endpoint: Endpoint) => {
		if (endpoint === this.endpoint) {
			this.instance.fire(EVENT_ADD_INPUT_ENDPOINT_CLICK, this.endpoint);
		}
	};
}

export const N8nAddInputEndpointHandler: EndpointHandler<
	N8nAddInputEndpoint,
	ComputedN8nAddInputEndpoint
> = {
	type: N8nAddInputEndpoint.type,
	cls: N8nAddInputEndpoint,
	compute: (ep: N8nAddInputEndpoint, anchorPoint: AnchorPlacement): ComputedN8nAddInputEndpoint => {
		const x = anchorPoint.curX - ep.params.size / 2;
		const y = anchorPoint.curY - ep.params.size / 2;
		const w = ep.params.size;
		const h = ep.params.size;

		ep.x = x;
		ep.y = y;
		ep.w = w;
		ep.h = h;

		ep.addClass('add-input-endpoint');
		return [x, y, w, h, ep.params.size];
	},

	getParams: (ep: N8nAddInputEndpoint): N8nAddInputEndpointParams => {
		return ep.params;
	},
};
