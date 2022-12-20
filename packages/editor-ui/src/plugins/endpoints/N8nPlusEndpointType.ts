import { EndpointHandler, Endpoint, EndpointRepresentation, Orientation, Overlay } from '@jsplumb/core';
import { AnchorPlacement, DotEndpointParams, EndpointRepresentationParams } from '@jsplumb/common';
import { createElement } from '@jsplumb/browser-ui';

export type ComputedN8nPlusEndpoint = [number, number, number, number, number];
const boxSize = {
	medium: 24,
	small: 18,
};
const stalkLength = 40;
interface N8nPlusEndpointParams extends EndpointRepresentationParams {
	radius?: number;
	connectedEndpoint: Endpoint;
}
export class N8nPlusEndpoint extends EndpointRepresentation<ComputedN8nPlusEndpoint> {
	radius: number;
	defaultOffset: number;
	defaultInnerRadius: number;
	label: string;
	labelOffset: number;
	size: string;
	hoverMessage: string;
	showOutputLabel: boolean;
	connectedEndpoint: Endpoint;
	stalkOverlay: Overlay | null;

	constructor(endpoint: Endpoint, params: N8nPlusEndpointParams) {
		super(endpoint, params);

		params = params || {};
		this.radius = params.radius || 9;
		this.connectedEndpoint = params.connectedEndpoint;
		console.log("🚀 ~ file: N8nPlusEndpointType.ts:33 ~ N8nPlusEndpoint ~ constructor ~ params.connectedEndpoint", params.connectedEndpoint);
		this.defaultOffset = 0.5 * this.radius;
		this.defaultInnerRadius = this.radius / 3;

		this.label = '';
		this.labelOffset = 0;
		this.size = 'medium';
		this.hoverMessage = '';
		this.showOutputLabel = true;
		this.stalkOverlay = null;

		console.log('__DEBUG: Constructor');
	}

	static type = 'N8nPlus';
	type = N8nPlusEndpoint.type;


	setStalkOverlay = () => {
		this.clearOverlays();
		this.stalkOverlay = this.endpoint.addOverlay({
			type: 'Custom',
			options: {
				id: 'plus-stalk',
				create: (c: Endpoint) => {
					const stalk = createElement('div', {}, 'plus-stalk');
					console.log('__DEBUG: Create plus stalk');
					return stalk;
				},
			},
		});
		// this.stalkOverlay.setVisible(true);
		console.log("__DEBUG: Stalk overlay", this.stalkOverlay);
		// setTimeout(() => {
		// 	this.instance.revalidate(this.stalkOverlay?.canvas);
		// 	console.log("__DEBUG: Stalk revalidate", this.stalkOverlay.canvas);
		// }, 0);
	};

	clearOverlays = () => {
		Object.keys(this.endpoint.getOverlays()).forEach((key) => {
			console.log("__DEBUG: Removing overlay: ", key);
			this.endpoint.removeOverlay(key);
		});
		if(this.stalkOverlay) {
			this.stalkOverlay = null;
		}
		// 	// this.endpoint.removeOverlay(this.stalkOverlay?.id);


		// 	// this.endpoint.instance._removeElement(this.stalkOverlay.component.);

		// 	setTimeout(() => {
		// 		console.log("🚀 ~ file: N8nPlusEndpointType.ts:64 ~ N8nPlusEndpoint ~ this.endpoint.overlays[this.stalkOverlay?.id].canvas", this.endpoint.overlays['plus-stalk']);
		// 		this.endpoint.instance._removeElement(this.endpoint.overlays['plus-stalk'].canvas);
		// 	}, 0);
	};
	setOverlaysVisible = (visible: boolean) => {
		Object.keys(this.endpoint.getOverlays()).forEach((overlay) => {
			this.endpoint.getOverlays()[overlay].setVisible(visible);
			console.log("__DEBUG Set is visible setting overlay", overlay);
		});
	};

	setIsVisible = (visible: boolean) => {
		Object.keys(this.endpoint.getOverlays()).forEach((overlay) => {
			this.endpoint.getOverlays()[overlay].setVisible(visible);
			console.log("__DEBUG Set is visible setting overlay", overlay);
		});
		this.setVisible(visible);
		// this.stalkOverlay?.component[visible? 'addClass' : 'removeClass']('visible');
		console.log("__DEBUG Set is visible", visible);
		// console.log('__DEBUG Stalk is visible: ', this.stalkOverlay?.isVisible());
	};
	// setSuccessOutput = (label: string) => {
	// 	console.log('Set success output');
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
	// 	console.log('Clearing success output');
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
		orientation: Orientation,
		endpointStyle: any,
	): ComputedN8nPlusEndpoint => {
		// ep.clearOverlays();
		// ep.setStalkOverlay();
		console.log('🚀 ~ file: N8nPlusEndpointType.ts:93 ~ ep', ep);
		console.log('Compute, N8nPlusEndpointHandler', anchorPoint);
		let x = anchorPoint.curX - ep.radius,
			y = anchorPoint.curY - ep.radius,
			w = ep.radius * 2,
			h = ep.radius * 2;

		if (endpointStyle && endpointStyle.stroke) {
			const lw = endpointStyle.strokeWidth || 1;
			x -= lw;
			y -= lw;
			w += lw * 2;
			h += lw * 2;
		}

		ep.x = x;
		ep.y = y;
		ep.w = w;
		ep.h = h;

		ep.size = endpointStyle.size || ep.size;
		ep.showOutputLabel = !!endpointStyle.showOutputLabel;

		// if (!ep.plusElement) [x, y, w, h, ep.radius];

		if (ep.hoverMessage !== endpointStyle.hoverMessage) {
			// const container = this.plusElement.querySelector('.plus-container') as HTMLElement;
			// const message = container.querySelector('.drop-hover-message');
			ep.hoverMessage = endpointStyle.hoverMessage;

			// message.innerHTML = endpointStyle.hoverMessage;
			// console.log(
			// 	"🚀 ~ file: N8nPlusEndpointType.ts:126 ~ ep.plusElement.querySelector('.drop-hover-message'",
			// 	ep,
			// );
			// ep.plusElement.querySelector('.drop-hover-message').innerHTML = endpointStyle.hoverMessage;
		}
		// console.log('Compute 2');
		// if (ep.plusElement && endpointStyle.size !== 'medium') {
		// 	ep.plusElement.classList.add(ep.size);
		// }
		// console.log('Compute 3');
		// setTimeout(() => {
		// 	console.log('Recalc offset', ep);
		// 	if (ep.label && !ep.labelOffset) {
		// 		// if label is hidden, offset is 0 so recalculate
		// 		ep.setSuccessOutput(ep.label);
		// 	}
		// }, 0);

		// const defaultPosition = [anchorPoint[0] + stalkLength + this.labelOffset, anchorPoint[1] - boxSize[ep.size] / 2, boxSize[ep.size], boxSize[ep.size]];

		// if (isDragging()) {
		// 	return defaultPosition;
		// }

		// if (hasEndpointConnections()) {
		// 	return [0, 0, 0, 0]; // remove hoverable box from view
		// }

		// return defaultPosition;
		// ep.setStalkOverlay();
		console.log('__DEBUG: Compute');
		ep.addClass('plus-endpoint');
		return [x, y, w, h, ep.radius];
	},

	getParams: (ep: N8nPlusEndpoint): Record<string, any> => {
		console.log('__DEBUG: Get Params');
		return { radius: ep.radius, connectedEndpoint: ep.connectedEndpoint };
	},
};
