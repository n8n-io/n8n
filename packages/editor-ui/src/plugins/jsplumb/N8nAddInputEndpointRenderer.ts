import { registerEndpointRenderer, svg } from '@jsplumb/browser-ui';
import { N8nAddInputEndpoint } from './N8nAddInputEndpointType';

export const register = () => {
	registerEndpointRenderer<N8nAddInputEndpoint>(N8nAddInputEndpoint.type, {
		makeNode: (endpointInstance: N8nAddInputEndpoint) => {
			const xOffset = 1;
			const lineYOffset = -2;
			const width = endpointInstance.params.width;
			const height = endpointInstance.params.height;
			const unconnectedDiamondSize = width / 2;
			const unconnectedDiamondWidth = unconnectedDiamondSize * Math.sqrt(2);
			const unconnectedPlusStroke = 2;
			const unconnectedPlusSize = width - 2 * unconnectedPlusStroke;

			const sizeDifference = (unconnectedPlusSize - unconnectedDiamondWidth) / 2;

			const container = svg.node('g', {
				style: `--svg-color: var(--endpoint-svg-color, var(${endpointInstance.params.color}))`,
				width,
				height,
			});

			const unconnectedGroup = svg.node('g', { class: 'add-input-endpoint-unconnected' });
			const unconnectedLine = svg.node('rect', {
				x: xOffset / 2 + unconnectedDiamondWidth / 2 + sizeDifference,
				y: unconnectedDiamondWidth + lineYOffset,
				width: 2,
				height: height - unconnectedDiamondWidth - unconnectedPlusSize,
				'stroke-width': 0,
				class: 'add-input-endpoint-line',
			});
			const unconnectedPlusGroup = svg.node('g', {
				transform: `translate(${xOffset / 2}, ${height - unconnectedPlusSize + lineYOffset})`,
			});
			const plusRectangle = svg.node('rect', {
				x: 1,
				y: 1,
				rx: 3,
				'stroke-width': unconnectedPlusStroke,
				fillOpacity: 0,
				height: unconnectedPlusSize,
				width: unconnectedPlusSize,
				class: 'add-input-endpoint-plus-rectangle',
			});
			const plusIcon = svg.node('path', {
				transform: `scale(${width / 24})`,
				d: 'm15.40655,9.89837l-3.30491,0l0,-3.30491c0,-0.40555 -0.32889,-0.73443 -0.73443,-0.73443l-0.73443,0c-0.40554,0 -0.73442,0.32888 -0.73442,0.73443l0,3.30491l-3.30491,0c-0.40555,0 -0.73443,0.32888 -0.73443,0.73442l0,0.73443c0,0.40554 0.32888,0.73443 0.73443,0.73443l3.30491,0l0,3.30491c0,0.40554 0.32888,0.73442 0.73442,0.73442l0.73443,0c0.40554,0 0.73443,-0.32888 0.73443,-0.73442l0,-3.30491l3.30491,0c0.40554,0 0.73442,-0.32889 0.73442,-0.73443l0,-0.73443c0,-0.40554 -0.32888,-0.73442 -0.73442,-0.73442z',
				class: 'add-input-endpoint-plus-icon',
			});

			unconnectedPlusGroup.appendChild(plusRectangle);
			unconnectedPlusGroup.appendChild(plusIcon);
			unconnectedGroup.appendChild(unconnectedLine);
			unconnectedGroup.appendChild(unconnectedPlusGroup);

			const defaultGroup = svg.node('g', { class: 'add-input-endpoint-default' });
			const defaultDiamond = svg.node('rect', {
				x: xOffset + sizeDifference + unconnectedPlusStroke,
				y: 0,
				'stroke-width': 0,
				width: unconnectedDiamondSize,
				height: unconnectedDiamondSize,
				transform: `translate(${unconnectedDiamondWidth / 2}, 0) rotate(45)`,
				class: 'add-input-endpoint-diamond',
			});

			defaultGroup.appendChild(defaultDiamond);

			container.appendChild(unconnectedGroup);
			container.appendChild(defaultGroup);

			endpointInstance.setVisible(false);

			return container;
		},
		updateNode: () => {},
	});
};
