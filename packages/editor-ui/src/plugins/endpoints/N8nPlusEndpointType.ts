import { EndpointHandler, Endpoint, EndpointRepresentation, Orientation } from "@jsplumb/core";
import { AnchorPlacement, DotEndpointParams } from "@jsplumb/common";
import { createElement } from "@jsplumb/browser-ui";

export type ComputedN8nPlusEndpoint = [ number, number, number, number, number ]
const boxSize = {
	medium: 24,
	small: 18,
};
const stalkLength = 40;

export class N8nPlusEndpoint extends EndpointRepresentation<ComputedN8nPlusEndpoint> {
	radius:number;
	defaultOffset:number;
	defaultInnerRadius:number;
	label: string;
	labelOffset: number;
	size: string;
	hoverMessage: string;
	showOutputLabel: boolean;
	plusElement: HTMLElement;
	// canvas: HTMLElement;

	constructor(endpoint:Endpoint, params?:DotEndpointParams) {
		super(endpoint, params);

		params = params || {};
		this.radius = params.radius || 9;
		this.defaultOffset = 0.5 * this.radius;
		this.defaultInnerRadius = this.radius / 3;

		this.label = '';
		this.labelOffset = 0;
		this.size = 'medium';
		this.hoverMessage = '';
		this.showOutputLabel = true;
		this.plusElement = {} as HTMLElement;
	}

	static type = "N8nPlus";
	type = N8nPlusEndpoint.type;

	setPlusElement(el:HTMLElement) {
		this.plusElement = el;
	}

	setSuccessOutput = (label: string) => {
		console.log('Set success output');
		if(!this.plusElement) return;

		this.plusElement.classList.add('success');
		if (this.showOutputLabel) {
			const plusStalk = this.plusElement.querySelector('.plus-stalk') as HTMLElement;
			const successOutput = this.plusElement.querySelector('.plus-stalk span') as HTMLElement;


			successOutput.textContent = label;
			this.label = label;
			this.labelOffset = successOutput.offsetWidth;

			plusStalk.style.width = `${stalkLength + this.labelOffset}px`;
			// if (this._jsPlumb && this._jsPlumb.instance && !this._jsPlumb.instance.isSuspendDrawing()) {
			// 	params.endpoint.repaint(); // force rerender to move plus hoverable/draggable space
			// }
		}
	};

	clearSuccessOutput(endpoint: N8nPlusEndpoint) {
		console.log('Clearing success output');
		// const container = this.plusElement.querySelector('.plus-container');
		const plusStalk = this.plusElement.querySelector('.plus-stalk') as HTMLElement;
		const successOutput = this.plusElement.querySelector('.plus-stalk span') as HTMLElement;

		this.plusElement.classList.remove('success');
		successOutput.textContent = '';
		this.label = '';
		this.labelOffset = 0;
		plusStalk.style.width = `${stalkLength}px`;
		endpoint.instance.repaint(endpoint);
	};
}


export const N8nPlusEndpointHandler:EndpointHandler<N8nPlusEndpoint, ComputedN8nPlusEndpoint> = {
    type:N8nPlusEndpoint.type,
    cls:N8nPlusEndpoint,
    compute: (
			ep: N8nPlusEndpoint,
			anchorPoint: AnchorPlacement,
			orientation: Orientation,
			endpointStyle: any,
		):ComputedN8nPlusEndpoint => {
			console.log("🚀 ~ file: N8nPlusEndpointType.ts:93 ~ ep", ep);
			console.log('Compute, N8nPlusEndpointHandler', anchorPoint);
			let x = anchorPoint.curX - ep.radius,
			y = anchorPoint.curY - ep.radius,
			w = ep.radius * 2,
			h = ep.radius * 2;

			if (endpointStyle && endpointStyle.stroke) {
				const lw = endpointStyle.strokeWidth || 1;
				x -= lw;
				y -= lw;
				w += (lw * 2);
				h += (lw * 2);
			}

			ep.x = x;
			ep.y = y;
			ep.w = w;
			ep.h = h;


			console.log('Compute 1');
			ep.size = endpointStyle.size || ep.size;
			ep.showOutputLabel = !!endpointStyle.showOutputLabel;

			if(!ep.plusElement)  [ x, y, w, h, ep.radius ];

			if (ep.hoverMessage !== endpointStyle.hoverMessage) {
				// const container = this.plusElement.querySelector('.plus-container') as HTMLElement;
				// const message = container.querySelector('.drop-hover-message');
				ep.hoverMessage = endpointStyle.hoverMessage;

				// message.innerHTML = endpointStyle.hoverMessage;
				console.log("🚀 ~ file: N8nPlusEndpointType.ts:126 ~ ep.plusElement.querySelector('.drop-hover-message'", ep);
				// ep.plusElement.querySelector('.drop-hover-message').innerHTML = endpointStyle.hoverMessage;
			}
			console.log('Compute 2');
			// if (ep.plusElement && endpointStyle.size !== 'medium') {
			// 	ep.plusElement.classList.add(ep.size);
			// }
			console.log('Compute 3');
			setTimeout(() => {
				console.log('Recalc offset', ep);
				if (ep.label && !ep.labelOffset) { // if label is hidden, offset is 0 so recalculate
					ep.setSuccessOutput(ep.label);
				}
			}, 0);

			// const defaultPosition = [anchorPoint[0] + stalkLength + this.labelOffset, anchorPoint[1] - boxSize[ep.size] / 2, boxSize[ep.size], boxSize[ep.size]];

			// if (isDragging()) {
			// 	return defaultPosition;
			// }

			// if (hasEndpointConnections()) {
			// 	return [0, 0, 0, 0]; // remove hoverable box from view
			// }

			// return defaultPosition;


			return [ x, y, w, h, ep.radius ];
    },

    getParams:(ep:N8nPlusEndpoint): Record<string, any> => {
			return { radius: ep.radius };
    },
};
