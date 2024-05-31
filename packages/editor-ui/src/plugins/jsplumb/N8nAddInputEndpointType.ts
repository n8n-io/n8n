import type { EndpointHandler, Endpoint } from '@jsplumb/core';
import { EndpointRepresentation } from '@jsplumb/core';
import type { AnchorPlacement, EndpointRepresentationParams } from '@jsplumb/common';
import { EVENT_ENDPOINT_CLICK } from '@jsplumb/browser-ui';

export type ComputedN8nAddInputEndpoint = [number, number, number, number, number];
interface N8nAddInputEndpointParams extends EndpointRepresentationParams {
	endpoint: Endpoint;
	width: number;
	height: number;
	color: string;
	multiple: boolean;
}
export const N8nAddInputEndpointType = 'N8nAddInput';
export const EVENT_ADD_INPUT_ENDPOINT_CLICK = 'eventAddInputEndpointClick';
export class N8nAddInputEndpoint extends EndpointRepresentation<ComputedN8nAddInputEndpoint> {
	params: N8nAddInputEndpointParams;

	constructor(endpoint: Endpoint, params: N8nAddInputEndpointParams) {
		super(endpoint, params);

		this.params = params;
		this.params.width = params.width || 18;
		this.params.height = params.height || 48;
		this.params.color = params.color || '--color-foreground-xdark';
		this.params.multiple = params.multiple || false;

		this.unbindEvents();
		this.bindEvents();
	}

	static type = N8nAddInputEndpointType;

	type = N8nAddInputEndpoint.type;

	bindEvents() {
		this.instance.bind(EVENT_ENDPOINT_CLICK, this.fireClickEvent);
	}

	unbindEvents() {
		this.instance.unbind(EVENT_ENDPOINT_CLICK, this.fireClickEvent);
	}

	setError() {
		this.endpoint.addClass('add-input-endpoint-error');
	}

	resetError() {
		this.endpoint.removeClass('add-input-endpoint-error');
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
	compute: (
		ep: EndpointRepresentation<ComputedN8nAddInputEndpoint>,
		anchorPoint: AnchorPlacement,
	): ComputedN8nAddInputEndpoint => {
		if (!(ep instanceof N8nAddInputEndpoint)) {
			throw Error('Unexpected Endpoint type');
		}
		const x = anchorPoint.curX - ep.params.width / 2;
		const y = anchorPoint.curY - ep.params.width / 2;
		const w = ep.params.width;
		const h = ep.params.height;

		ep.x = x;
		ep.y = y;
		ep.w = w;
		ep.h = h;

		ep.addClass('add-input-endpoint');
		if (ep.params.multiple) {
			ep.addClass('add-input-endpoint-multiple');
		}
		return [x, y, w, h, ep.params.width];
	},

	getParams: (ep: N8nAddInputEndpoint): N8nAddInputEndpointParams => {
		return ep.params;
	},
};
