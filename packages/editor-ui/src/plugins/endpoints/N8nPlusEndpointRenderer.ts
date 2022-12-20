import { registerEndpointRenderer, svg, createElement } from '@jsplumb/browser-ui';
import { N8nPlusEndpoint } from './N8nPlusEndpointType';
import { PaintStyle } from '@jsplumb/common';
import { isEmpty } from '@jsplumb/util';
const CIRCLE = 'circle';
const stalkLength = 40;

export const register = () => {
	registerEndpointRenderer<N8nPlusEndpoint>(N8nPlusEndpoint.type, {
		makeNode: (ep: N8nPlusEndpoint, style: PaintStyle) => {
			const group = svg.node('g', {
				"width": 24,
				"height": 24,
			});

			const containerBorder = svg.node('rect', {
				rx: 3,
				stroke: '#000000',
				'stroke-width': 2,
				fillOpacity: 0,
				height: 22,
				width: 22,
				y: 1,
				x: 1,
			});
			const plusPath = svg.node('path', {
				d: "m16.40655,10.89837l-3.30491,0l0,-3.30491c0,-0.40555 -0.32889,-0.73443 -0.73443,-0.73443l-0.73443,0c-0.40554,0 -0.73442,0.32888 -0.73442,0.73443l0,3.30491l-3.30491,0c-0.40555,0 -0.73443,0.32888 -0.73443,0.73442l0,0.73443c0,0.40554 0.32888,0.73443 0.73443,0.73443l3.30491,0l0,3.30491c0,0.40554 0.32888,0.73442 0.73442,0.73442l0.73443,0c0.40554,0 0.73443,-0.32888 0.73443,-0.73442l0,-3.30491l3.30491,0c0.40554,0 0.73442,-0.32889 0.73442,-0.73443l0,-0.73443c0,-0.40554 -0.32888,-0.73442 -0.73442,-0.73442z",
			});
			if (ep.size !== 'medium') {
				ep.addClass(ep.size);
			}
			group.appendChild(containerBorder);
			group.appendChild(plusPath);

			ep.setStalkOverlay();
			ep.setVisible(false);
			console.log('__DEBUG: Make node');
			return group;
		},

		updateNode: (ep: N8nPlusEndpoint, node) => {
			const hasConnections = () => {
				const connections = [...ep.endpoint.connections, ...ep.connectedEndpoint.connections];
				return connections.length > 0;
			};
			ep.instance.setSuspendDrawing(true);
			ep.setVisible(!ep.instance.isConnectionBeingDragged && !hasConnections());
			setTimeout(() => ep.setIsVisible(!hasConnections()), 0);
			ep.instance.setSuspendDrawing(false);
		},
	});
};
