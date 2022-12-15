import { registerEndpointRenderer, svg, createElement } from '@jsplumb/browser-ui';
import { N8nPlusEndpoint } from './N8nPlusEndpointType';
import { PaintStyle } from '@jsplumb/common';
import { isEmpty } from '@jsplumb/util';
const CIRCLE = 'circle';
const stalkLength = 40;

export const register = () => {
	registerEndpointRenderer<N8nPlusEndpoint>(N8nPlusEndpoint.type, {
		// TODO `instance` not needed here
		makeNode: (ep: N8nPlusEndpoint, style: PaintStyle) => {
			const canvas = createElement(
				'div',
				{
					display: 'block',
					background: 'transparent',
					position: 'absolute',
				},
				`${ep.instance.endpointClass} plus-endpoint`,
			);

			canvas.innerHTML = `
				<div class="plus-stalk">
					<div class="connection-run-items-label">
						<span class="floating"></span>
					</div>
				</div>

				<div class="plus-container">
					<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="plus" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="svg-inline--fa fa-plus">
						<path fill="currentColor" d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z" class=""></path>
					</svg>
					<div class="drop-hover-message">${style.hoverMessage}</div>
				</div>
			`;
			if (style.size !== 'medium') {
				canvas.classList.add(style.size);
			}

			canvas.style.top = `${ep.y - 3}px`;
			canvas.style.left = `${ep.x + 10 + stalkLength}px`;

			function proxyPlusClick(e: MouseEvent) {
				// ep.endpoint.fire("plusClick", e);
				console.log('Proxy click');
			}

			console.log('Make node 2', ep.plusElement);
			const previousEl = ep.endpoint.element.querySelector('.plus-endpoint');
			console.log(
				'🚀 ~ file: N8nPlusEndpointRenderer.ts:51 ~ register ~ previousEl',
				ep.plusElement,
			);
			// canvas.addEventListener('click', proxyPlusClick);
			ep.instance._appendElementToContainer(canvas);
			// ep.addClass('plus-svg-circle');
			// ep.setPlusElement(canvas);
			// TODO: How to registe the second endpoint as well?

			const svgNode = svg.node(CIRCLE, {
				cx: 0,
				cy: 0,
				r: 0,
			});
			ep.node = canvas;
			svgNode.appendChild(canvas);

			return canvas;
		},

		updateNode: (ep: N8nPlusEndpoint, node) => {
			// const canvas = createElement(
			// 	'foreignObject',
			// 	{
			// 		display: 'block',
			// 		background: 'transparent',
			// 		position: 'absolute',
			// 	},
			// 	`${ep.instance.endpointClass} plus-endpoint`,
			// );

			// canvas.innerHTML = `
			// 	<div class="plus-stalk">
			// 		<div class="connection-run-items-label">
			// 			<span class="floating"></span>
			// 		</div>
			// 	</div>

			// 	<div class="plus-container">
			// 		<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="plus" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="svg-inline--fa fa-plus">
			// 			<path fill="currentColor" d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z" class=""></path>
			// 		</svg>
			// 		<div class="drop-hover-message">123</div>
			// 	</div>
			// `;
			// // if (style.size !== 'medium') {
			// // 	canvas.classList.add(style.size);
			// // }

			// canvas.style.top = `${ep.y - 3}px`;
			// canvas.style.left = `${ep.x + 10 + stalkLength}px`;

			// console.log("🚀 ~ file: N8nPlusEndpointRenderer.ts:77 ~ register ~ node", node.parentElement);
			// node.parentElement?.appendChild(canvas);
			// console.log("🚀 ~ file: N8nPlusEndpointRenderer.ts:52 ~ register ~ ep.instance.currentlyDragging", ep.instance.currentlyDragging);
			if (!ep.instance.currentlyDragging) {
				// console.log('plusElement, ', ep.plusElement);
				ep.node.style.top = `${ep.y - 3}px`;
				ep.node.style.left = `${ep.x + 10 + stalkLength}px`;
			}
			// svg.attr(node, {
			// 	// "cx": 9,
			// 	// "cy": 9,
			// 	// "r": 8,
			// });
			console.log("🚀 ~ file: N8nPlusEndpointRenderer.ts:124 ~ register ~ node", node);
		},
	});
};
