import { EndpointHandler, Endpoint, EndpointRepresentation, Overlay } from '@jsplumb/core';
import { AnchorPlacement, EndpointRepresentationParams } from '@jsplumb/common';
import {
	createElement,
	EVENT_ENDPOINT_MOUSEOVER,
	EVENT_ENDPOINT_MOUSEOUT,
	EVENT_ENDPOINT_CLICK,
	EVENT_CONNECTION_ABORT,
} from '@jsplumb/browser-ui';

export type ComputedN8nPlusEndpoint = [number, number, number, number, number];
interface N8nPlusEndpointParams extends EndpointRepresentationParams {
	dimensions: number;
	connectedEndpoint: Endpoint;
	hoverMessage: string;
	size: 'small' | 'medium';
	showOutputLabel: boolean;
}
export const PlusStalkOverlay = 'plus-stalk';
export const HoverMessageOverlay = 'hover-message';

export class N8nPlusEndpoint extends EndpointRepresentation<ComputedN8nPlusEndpoint> {
	params: N8nPlusEndpointParams;
	label: string;
	stalkOverlay: Overlay | null;
	messageOverlay: Overlay | null;

	constructor(endpoint: Endpoint, params: N8nPlusEndpointParams) {
		super(endpoint, params);

		this.params = params;

		this.label = '';
		this.stalkOverlay = null;
		this.messageOverlay = null;

		this.unbindEvents();
		this.bindEvents();
	}

	static type = 'N8nPlus';
	type = N8nPlusEndpoint.type;

	setupOverlays() {
		this.clearOverlays();
		this.endpoint.instance.setSuspendDrawing(true);
		this.stalkOverlay = this.endpoint.addOverlay({
			type: 'Custom',
			options: {
				id: PlusStalkOverlay,
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
				create: () => {
					const hoverMessage = createElement('p', {}, `${HoverMessageOverlay} ${this.params.size}`);
					hoverMessage.innerHTML = this.params.hoverMessage;
					return hoverMessage;
				},
			},
		});
		this.endpoint.instance.setSuspendDrawing(false);
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
			this.instance.fire('plusEndpointClick', this.endpoint);
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
		this.instance.setSuspendDrawing(true);
		Object.keys(this.endpoint.getOverlays()).forEach((overlay) => {
			this.endpoint.getOverlays()[overlay].setVisible(visible);
		});

		this.setVisible(visible);

		// Re-trigger the success state if label is set
		if (visible && this.label) {
			this.setSuccessOutput(this.label);
		}
		this.instance.setSuspendDrawing(false);
	}

	setSuccessOutput(label: string) {
		this.endpoint.addClass('ep-success');
		if (this.params.showOutputLabel) {
			this.label = label;
			this.setStalkLabels();
		}
	}

	clearSuccessOutput() {
		this.endpoint.removeOverlay('successOutputOverlay');
		this.endpoint.removeClass('ep-success');
		this.label = '';
		this.setStalkLabels();
	}
}

export const N8nPlusEndpointHandler: EndpointHandler<N8nPlusEndpoint, ComputedN8nPlusEndpoint> = {
	type: N8nPlusEndpoint.type,
	cls: N8nPlusEndpoint,
	compute: (ep: N8nPlusEndpoint, anchorPoint: AnchorPlacement): ComputedN8nPlusEndpoint => {
		const x = anchorPoint.curX - ep.params.dimensions / 2;
		const y = anchorPoint.curY - ep.params.dimensions / 2;
		const w = ep.params.dimensions;
		const h = ep.params.dimensions;

		ep.x = x;
		ep.y = y;
		ep.w = w;
		ep.h = h;

		ep.addClass('plus-endpoint');
		return [x, y, w, h, ep.params.dimensions];
	},

	getParams: (ep: N8nPlusEndpoint): N8nPlusEndpointParams => {
		return ep.params;
	},
};
