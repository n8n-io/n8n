(function () {
	var root = this, _jp = root.jsPlumb, _ju = root.jsPlumbUtil;

	var DOMElementEndpoint = function (params) {
		_jp.jsPlumbUIComponent.apply(this, arguments);
		this._jsPlumb.displayElements = [];
	};
	_ju.extend(DOMElementEndpoint, _jp.jsPlumbUIComponent, {
		getDisplayElements: function () {
			return this._jsPlumb.displayElements;
		},
		appendDisplayElement: function (el) {
			this._jsPlumb.displayElements.push(el);
		},
	});

	/*
		* Class: Endpoints.N8nPlus
		*/
	_jp.Endpoints.N8nPlus = function (params) {
		const _super = _jp.Endpoints.AbstractEndpoint.apply(this, arguments);
		this.type = "N8nPlus";
		DOMElementEndpoint.apply(this, arguments);
		this._compute = (anchorPoint, orientation, endpointStyle, connectorPaintStyle) => {
			const endpoint = params.endpoint;
			const connections = endpoint.connections;
			if (connections.length >= 1) {
				return [anchorPoint[0], anchorPoint[1], 0, 0];
			}

			return [anchorPoint[0], anchorPoint[1] - 12, 64, 24];
		};

		var clazz = params.cssClass ? " " + params.cssClass : "";

		this.canvas = _jp.createElement("div", {
			display: "block",
			background: "transparent",
			position: "absolute",
		}, this._jsPlumb.instance.endpointClass + clazz + ' plus-container');

		this.canvas.innerHTML = `
			<style type="text/css">
				.plus-container svg {
					height: 100%;
					width: 100%;
					cursor: pointer;
				}

				.plus-container svg path:first-of-type {
					stroke: hsl( 228, 9.6%, 79.6% );
				}

				.plus-container svg rect:first-of-type {
					stroke: #7D838F;
				}

				.plus-container svg path:nth-of-type(2) {
					fill: #7D838F;
				}

				// .plus-container:hover svg path:first-of-type {
				// 	stroke: #ff6d5a;
				// }

				.plus-container:hover svg rect:first-of-type {
					stroke: #ff6d5a;
				}

				.plus-container:hover svg path:nth-of-type(2) {
					fill: #ff6d5a;
				}

				.plus-container:hover .drop-hover-message {
					display: block;
				}

				.drop-hover-message {
					font-weight: 600;
					font-size: 12px;
					line-height: 16px;
					color: #909399;

					position: absolute;
					top: -4px;
					left: calc(100% + 8px);
					width: 200px;
					display: none;
				}
			</style>
			<svg width="64" height="24" viewBox="0 0 64 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M0 12L40 12" stroke-width="2"/>
				<rect x="41" y="1" width="22" height="22" rx="3" fill="white" stroke-width="2"/>
				<path d="M56.125 10.8438H53.0312V7.75C53.0312 7.38477 52.709 7.0625 52.3438 7.0625H51.6562C51.2695 7.0625 50.9688 7.38477 50.9688 7.75V10.8438H47.875C47.4883 10.8438 47.1875 11.166 47.1875 11.5312V12.2188C47.1875 12.6055 47.4883 12.9062 47.875 12.9062H50.9688V16C50.9688 16.3867 51.2695 16.6875 51.6562 16.6875H52.3438C52.709 16.6875 53.0312 16.3867 53.0312 16V12.9062H56.125C56.4902 12.9062 56.8125 12.6055 56.8125 12.2188V11.5312C56.8125 11.166 56.4902 10.8438 56.125 10.8438Z" />
			</svg>
			<div class="drop-hover-message">
				Click to add node</br>
				or drag to connect
			</div>
		`;

		this.canvas.addEventListener('click', (e) => {
			this._jsPlumb.instance.fire('plusEndpointClick', params.endpoint, e);
		});

		this._jsPlumb.instance.appendElement(this.canvas);

		this.paint = function (style, anchor) {
			console.log(style, anchor);
			_ju.sizeElement(this.canvas, this.x, this.y, this.w, this.h);
		};
	};
	_ju.extend(_jp.Endpoints.N8nPlus, [_jp.Endpoints.AbstractEndpoint, DOMElementEndpoint], {
		cleanup: function () {
			if (this.canvas && this.canvas.parentNode) {
				this.canvas.parentNode.removeChild(this.canvas);
			}
		},
	});
	_jp.Endpoints.svg.N8nPlus = _jp.Endpoints.N8nPlus;
})();
