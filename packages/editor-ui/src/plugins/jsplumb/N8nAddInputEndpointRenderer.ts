import { registerEndpointRenderer, svg } from '@jsplumb/browser-ui';
import { N8nAddInputEndpoint } from './N8nAddInputEndpointType';

export const register = () => {
	registerEndpointRenderer<N8nAddInputEndpoint>(N8nAddInputEndpoint.type, {
		makeNode: (endpointInstance: N8nAddInputEndpoint) => {
			const fill = endpointInstance.params.endpoint.paintStyle.fill;

			console.log(endpointInstance, endpointInstance.params.endpoint.paintStyle.fill);
			const group = svg.node('g');
			const containerBorder = svg.node('rect', {
				rx: 3,
				'stroke-width': 2,
				fillOpacity: 0,
				height: endpointInstance.params.size - 2,
				width: endpointInstance.params.size - 2,
				y: 1,
				x: 1,
			});
			const plusPath = svg.node('path', {
				d: 'm16.40655,10.89837l-3.30491,0l0,-3.30491c0,-0.40555 -0.32889,-0.73443 -0.73443,-0.73443l-0.73443,0c-0.40554,0 -0.73442,0.32888 -0.73442,0.73443l0,3.30491l-3.30491,0c-0.40555,0 -0.73443,0.32888 -0.73443,0.73442l0,0.73443c0,0.40554 0.32888,0.73443 0.73443,0.73443l3.30491,0l0,3.30491c0,0.40554 0.32888,0.73442 0.73442,0.73442l0.73443,0c0.40554,0 0.73443,-0.32888 0.73443,-0.73442l0,-3.30491l3.30491,0c0.40554,0 0.73442,-0.32889 0.73442,-0.73443l0,-0.73443c0,-0.40554 -0.32888,-0.73442 -0.73442,-0.73442z',
				fill: endpointInstance.params.endpoint.paintStyle.stroke as string,
			});

			group.appendChild(containerBorder);
			group.appendChild(plusPath);

			endpointInstance.setupOverlays();
			endpointInstance.setVisible(false);
			return group;
		},

		updateNode: (endpointInstance: N8nAddInputEndpoint) => {
			// const ifNoConnections = ep.getConnections().length === 0;
			//
			// ep.setIsVisible(ifNoConnections);
			endpointInstance.setIsVisible(true);
		},
	});
};
