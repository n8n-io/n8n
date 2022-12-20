import { EndpointHandler, Endpoint, EndpointRepresentation, Overlay } from '@jsplumb/core';
import { AnchorPlacement, EndpointRepresentationParams } from '@jsplumb/common';
import { createElement, EVENT_ENDPOINT_MOUSEOVER, EVENT_ENDPOINT_MOUSEOUT, EVENT_ENDPOINT_CLICK } from '@jsplumb/browser-ui';

export type ComputedN8nPlusEndpoint = [number, number, number, number, number];
interface N8nPlusEndpointParams extends EndpointRepresentationParams {
	dimensions: number;
	connectedEndpoint: Endpoint;
	hoverMessage: string;
	showOutputLabel: boolean;
	size: 'small' | 'medium';
}
export const PlusStalkOverlay = 'plus-stalk';
export const HoverMessageOverlay = 'hover-message';

export class N8nPlusEndpoint extends EndpointRepresentation<ComputedN8nPlusEndpoint> {
	params: N8nPlusEndpointParams;
	label: string;
	labelOffset: number;
	stalkOverlay: Overlay | null;
	messageOverlay: Overlay | null;

	constructor(endpoint: Endpoint, params: N8nPlusEndpointParams) {
		super(endpoint, params);

		this.params = params;

		this.label = '';
		this.labelOffset = 0;
		this.stalkOverlay = null;
		this.messageOverlay = null;

		this.unbindEvents();
		this.bindEvents();
	}

	static type = 'N8nPlus';
	type = N8nPlusEndpoint.type;

	setupOverlays = () => {
		this.clearOverlays();
		this.endpoint.instance.setSuspendDrawing(true);
		this.stalkOverlay = this.endpoint.addOverlay({
			type: 'Custom',
			options: {
				id: PlusStalkOverlay,
				create: () => {
					const stalk = createElement('i', {}, PlusStalkOverlay);
					return stalk;
				},
			},
		});
		this.messageOverlay = this.endpoint.addOverlay({
			type: 'Custom',
			options: {
				id: HoverMessageOverlay,
				create: () => {
					const hoverMessage = createElement('p', {}, HoverMessageOverlay);
					hoverMessage.innerHTML = this.params.hoverMessage;
					return hoverMessage;
				},
			},
		});
		this.endpoint.instance.setSuspendDrawing(false);
	};
	bindEvents = () => {
		this.instance.bind(EVENT_ENDPOINT_MOUSEOVER, this.setHoverMessageVisible);
		this.instance.bind(EVENT_ENDPOINT_MOUSEOUT, this.unsetHoverMessageVisible);
		this.instance.bind(EVENT_ENDPOINT_CLICK, this.fireClickEvent);
	};
	unbindEvents = () => {
		this.instance.unbind(EVENT_ENDPOINT_MOUSEOVER, this.setHoverMessageVisible);
		this.instance.unbind(EVENT_ENDPOINT_MOUSEOUT, this.unsetHoverMessageVisible);
		this.instance.unbind(EVENT_ENDPOINT_CLICK, this.fireClickEvent);
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
	clearOverlays = () => {
		Object.keys(this.endpoint.getOverlays()).forEach((key) => {
			this.endpoint.removeOverlay(key);
		});
		this.stalkOverlay = null;
		this.messageOverlay = null;
	};
	setOverlaysVisible = (visible: boolean) => {
		Object.keys(this.endpoint.getOverlays()).forEach((overlay) => {
			this.endpoint.getOverlays()[overlay].setVisible(visible);
		});
	};

	setIsVisible = (visible: boolean) => {
		Object.keys(this.endpoint.getOverlays()).forEach((overlay) => {
			this.endpoint.getOverlays()[overlay].setVisible(visible);
		});

		this.setVisible(visible);
	};

	// setSuccessOutput = (label: string) => {
	// 	if (!this.plusElement) return;

	// 	this.plusElement.classList.add('success');
	// 	if (this.showOutputLabel) {
	// 		const plusStalk = this.plusElement.querySelector('.plus-stalk') as HTMLElement;
	// 		const successOutput = this.plusElement.querySelector('.plus-stalk span') as HTMLElement;

	// 		successOutput.textContent = label;
	// 		this.label = label;
	// 		this.labelOffset = successOutput.offsetWidth;

	// 		plusStalk.style.width = `${stalkLength + this.labelOffset}px`;
	// 		// if (this._jsPlumb && this._jsPlumb.instance && !this._jsPlumb.instance.isSuspendDrawing()) {
	// 		// 	params.endpoint.repaint(); // force rerender to move plus hoverable/draggable space
	// 		// }
	// 	}
	// };

	// clearSuccessOutput(endpoint: N8nPlusEndpoint) {
	// 	// const container = this.plusElement.querySelector('.plus-container');
	// 	const plusStalk = this.plusElement.querySelector('.plus-stalk') as HTMLElement;
	// 	const successOutput = this.plusElement.querySelector('.plus-stalk span') as HTMLElement;

	// 	this.plusElement.classList.remove('success');
	// 	successOutput.textContent = '';
	// 	this.label = '';
	// 	this.labelOffset = 0;
	// 	plusStalk.style.width = `${stalkLength}px`;
	// 	endpoint.instance.repaint(endpoint);
	// }

	// ep.clearOverlays();
	// ep.setStalkOverlay();
}

export const N8nPlusEndpointHandler: EndpointHandler<N8nPlusEndpoint, ComputedN8nPlusEndpoint> = {
	type: N8nPlusEndpoint.type,
	cls: N8nPlusEndpoint,
	compute: (
		ep: N8nPlusEndpoint,
		anchorPoint: AnchorPlacement,
	): ComputedN8nPlusEndpoint => {
		const x = anchorPoint.curX - (ep.params.dimensions / 2);
		const y = anchorPoint.curY - (ep.params.dimensions / 2);
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
