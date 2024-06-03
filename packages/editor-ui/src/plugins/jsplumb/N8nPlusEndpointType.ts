import type { EndpointHandler, Endpoint, Overlay } from '@jsplumb/core';
import { EndpointRepresentation } from '@jsplumb/core';
import type { AnchorPlacement, EndpointRepresentationParams } from '@jsplumb/common';
import {
	createElement,
	EVENT_ENDPOINT_MOUSEOVER,
	EVENT_ENDPOINT_MOUSEOUT,
	EVENT_ENDPOINT_CLICK,
	EVENT_CONNECTION_ABORT,
} from '@jsplumb/browser-ui';

export type ComputedN8nPlusEndpoint = [number, number, number, number, number];
export type N8nEndpointLabelLength = 'small' | 'medium' | 'large';
interface N8nPlusEndpointParams extends EndpointRepresentationParams {
	dimensions: number;
	connectedEndpoint: Endpoint;
	hoverMessage: string;
	endpointLabelLength: N8nEndpointLabelLength;
	size: 'small' | 'medium';
	showOutputLabel: boolean;
}
export const PlusStalkOverlay = 'plus-stalk';
export const HoverMessageOverlay = 'hover-message';
export const N8nPlusEndpointType = 'N8nPlus';
export const EVENT_PLUS_ENDPOINT_CLICK = 'eventPlusEndpointClick';
export class N8nPlusEndpoint extends EndpointRepresentation<ComputedN8nPlusEndpoint> {
	params: N8nPlusEndpointParams;

	label: string;

	stalkOverlay: Overlay | null;

	messageOverlay: Overlay | null;

	canvas: HTMLElement | null;

	constructor(endpoint: Endpoint, params: N8nPlusEndpointParams) {
		super(endpoint, params);

		this.params = params;
		this.label = '';
		this.stalkOverlay = null;
		this.messageOverlay = null;
		this.canvas = null;

		this.unbindEvents();
		this.bindEvents();
	}

	static type = N8nPlusEndpointType;

	type = N8nPlusEndpoint.type;

	setupOverlays() {
		this.clearOverlays();
		this.stalkOverlay = this.endpoint.addOverlay({
			type: 'Custom',
			options: {
				id: PlusStalkOverlay,
				attributes: {
					'data-endpoint-label-length': this.params.endpointLabelLength,
				},
				create: () => {
					const stalk = createElement('div', {}, `${PlusStalkOverlay} ${this.params.size}`);
					return stalk;
				},
			},
		});
		this.messageOverlay = this.endpoint.addOverlay({
			type: 'Custom',
			options: {
				id: HoverMessageOverlay,
				location: 0.5,
				attributes: {
					'data-endpoint-label-length': this.params.endpointLabelLength,
				},
				create: () => {
					const hoverMessage = createElement('p', {}, `${HoverMessageOverlay} ${this.params.size}`);
					hoverMessage.innerHTML = this.params.hoverMessage;
					return hoverMessage;
				},
			},
		});
	}

	bindEvents() {
		this.instance.bind(EVENT_ENDPOINT_MOUSEOVER, this.setHoverMessageVisible);
		this.instance.bind(EVENT_ENDPOINT_MOUSEOUT, this.unsetHoverMessageVisible);
		this.instance.bind(EVENT_ENDPOINT_CLICK, this.fireClickEvent);
		this.instance.bind(EVENT_CONNECTION_ABORT, this.setStalkLabels);
	}

	unbindEvents() {
		this.instance.unbind(EVENT_ENDPOINT_MOUSEOVER, this.setHoverMessageVisible);
		this.instance.unbind(EVENT_ENDPOINT_MOUSEOUT, this.unsetHoverMessageVisible);
		this.instance.unbind(EVENT_ENDPOINT_CLICK, this.fireClickEvent);
		this.instance.unbind(EVENT_CONNECTION_ABORT, this.setStalkLabels);
	}

	setStalkLabels = () => {
		if (!this.endpoint) return;

		const stalkOverlay = this.endpoint.getOverlay(PlusStalkOverlay);
		const messageOverlay = this.endpoint.getOverlay(HoverMessageOverlay);

		if (stalkOverlay && messageOverlay) {
			// Increase the size of the stalk overlay if the label is too long
			const fnKey = this.label.length > 10 ? 'add' : 'remove';
			this.instance[`${fnKey}OverlayClass`](stalkOverlay, 'long-stalk');
			this.instance[`${fnKey}OverlayClass`](messageOverlay, 'long-stalk');
			this[`${fnKey}Class`]('long-stalk');

			if (this.label) {
				// @ts-expect-error: Overlay interface is missing the `canvas` property
				stalkOverlay.canvas.setAttribute('data-label', this.label);
			}
		}
	};

	fireClickEvent = (endpoint: Endpoint) => {
		if (endpoint === this.endpoint) {
			this.instance.fire(EVENT_PLUS_ENDPOINT_CLICK, this.endpoint);
		}
	};

	setHoverMessageVisible = (endpoint: Endpoint) => {
		if (endpoint === this.endpoint && this.messageOverlay) {
			this.instance.addOverlayClass(this.messageOverlay, 'visible');
		}
	};

	unsetHoverMessageVisible = (endpoint: Endpoint) => {
		if (endpoint === this.endpoint && this.messageOverlay) {
			this.instance.removeOverlayClass(this.messageOverlay, 'visible');
		}
	};

	clearOverlays() {
		Object.keys(this.endpoint.getOverlays()).forEach((key) => {
			this.endpoint.removeOverlay(key);
		});
		this.stalkOverlay = null;
		this.messageOverlay = null;
	}

	getConnections() {
		const connections = [
			...this.endpoint.connections,
			...this.params.connectedEndpoint.connections,
		];

		return connections;
	}

	setIsVisible(visible: boolean) {
		Object.keys(this.endpoint.getOverlays()).forEach((overlay) => {
			this.endpoint.getOverlays()[overlay].setVisible(visible);
		});
		this.setVisible(visible);
		// Re-trigger the success state if label is set
		if (visible && this.label) {
			this.setSuccessOutput(this.label);
		}
	}

	setSuccessOutput(label: string) {
		this.endpoint.addClass('ep-success');
		if (this.params.showOutputLabel) {
			this.label = label;
			this.setStalkLabels();
			return;
		}

		this.endpoint.addClass('ep-success--without-label');
	}

	clearSuccessOutput() {
		this.endpoint.removeOverlay('successOutputOverlay');
		this.endpoint.removeClass('ep-success');
		this.endpoint.removeClass('ep-success--without-label');
		this.label = '';
		this.setStalkLabels();
	}
}

export const N8nPlusEndpointHandler: EndpointHandler<N8nPlusEndpoint, ComputedN8nPlusEndpoint> = {
	type: N8nPlusEndpoint.type,
	cls: N8nPlusEndpoint,
	compute: (
		ep: EndpointRepresentation<ComputedN8nPlusEndpoint>,
		anchorPoint: AnchorPlacement,
	): ComputedN8nPlusEndpoint => {
		if (!(ep instanceof N8nPlusEndpoint)) {
			throw Error('Unexpected Endpoint type');
		}
		const x = anchorPoint.curX - ep.params.dimensions / 2;
		const y = anchorPoint.curY - ep.params.dimensions / 2;
		const w = ep.params.dimensions;
		const h = ep.params.dimensions;

		ep.x = x;
		ep.y = y;
		ep.w = w;
		ep.h = h;

		ep.canvas?.setAttribute('data-endpoint-label-length', ep.params.endpointLabelLength);

		ep.addClass('plus-endpoint');
		return [x, y, w, h, ep.params.dimensions];
	},

	getParams: (ep: N8nPlusEndpoint): N8nPlusEndpointParams => {
		return ep.params;
	},
};
