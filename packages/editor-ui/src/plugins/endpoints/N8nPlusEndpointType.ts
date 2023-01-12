import { EndpointHandler, Endpoint, EndpointRepresentation, Overlay } from '@jsplumb/core';
import { AnchorPlacement, EndpointRepresentationParams } from '@jsplumb/common';
import {
	createElement,
	EVENT_ENDPOINT_MOUSEOVER,
	EVENT_ENDPOINT_MOUSEOUT,
	EVENT_ENDPOINT_CLICK,
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

	setupOverlays = () => {
		this.clearOverlays();
		this.endpoint.instance.setSuspendDrawing(true);
		this.stalkOverlay = this.endpoint.addOverlay({
			type: 'Custom',
			options: {
				id: PlusStalkOverlay,
				create: () => {
					const stalk = createElement('i', {}, `${PlusStalkOverlay} ${this.params.size}`);
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

		// Re-render success output overlay if label is set and it doesn't exist
		const successOutputOverlay = this.endpoint.getOverlay('successOutputOverlay');
		if (visible && this.label && !successOutputOverlay) {
			this.setSuccessOutput(this.label);
		}
	};

	setSuccessOutput(label: string) {
		this.endpoint.addClass('success');
		if (this.params.showOutputLabel) {
			this.endpoint.removeOverlay('successOutputOverlay');
			this.endpoint.addOverlay({
				type: 'Custom',
				options: {
					id: 'successOutputOverlay',
					create: () => {
						const container = document.createElement('div');
						const span = document.createElement('span');

						container.classList.add(
							'connection-run-items-label',
							'connection-run-items-label--stalk',
						);
						span.classList.add('floating');
						span.innerHTML = label;
						container.appendChild(span);
						return container;
					},
				},
			});
			this.label = label;
			this.instance.repaint(this.endpoint.element);
		}
	}

	clearSuccessOutput() {
		this.endpoint.removeOverlay('successOutputOverlay');
		this.endpoint.removeClass('success');
		this.label = '';
		this.instance.repaint(this.endpoint.element);
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
