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

			return [anchorPoint[0] + 40, anchorPoint[1] - 12, 24, 24];
		};

		var clazz = params.cssClass ? " " + params.cssClass : "";

		this.canvas = _jp.createElement("div", {
			display: "block",
			background: "transparent",
			position: "absolute",
		}, this._jsPlumb.instance.endpointClass + clazz + ' plus-endpoint');

		this.canvas.innerHTML = `
			<style type="text/css">
				.plus-endpoint {
					cursor: pointer;
				}

				.plus-stalk {
					border-top: 2px solid var(--color-foreground-dark);
					position: absolute;
					width: 40px;
					height: 0;
					right: 100%;
					top: calc(50% - 1px);
					pointer-events: none;
				}

				.plus-container {
					color: var(--color-foreground-xdark);
					border: 2px solid var(--color-foreground-xdark);
					background-color: var(--color-background-xlight);
					border-radius: var(--border-radius-base);
					height: var(--spacing-l);
					width: var(--spacing-l);

					display: inline-flex;
					align-items: center;
					justify-content: center;
					font-size: var(--font-size-2xs);
					position: absolute;

					top: 0;
					right: 0;
					pointer-events: none;
				}

				.plus-container svg path:nth-of-type(2) {
					fill: #7D838F;
				}

				.drop-hover-message {
					font-weight: 600;
					font-size: 12px;
					line-height: 16px;
					color: #909399;

					position: absolute;
					top: -6px;
					left: calc(100% + 8px);
					width: 200px;
					display: none;
				}

				.hidden .plus-container {
					display: none;
				}

				.hidden .plus-stalk {
					display: none;
				}

				.success .plus-stalk {
					border-color: var(--color-success-light);
				}

			</style>

			<div class="plus-stalk">
			</div>

			<div class="plus-container">
				<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="plus" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="svg-inline--fa fa-plus fa-w-14 Icon__medium_ctPPJ">
					<path fill="currentColor" d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z" class=""></path>
				</svg>
				<div class="drop-hover-message">
					Click to add node</br>
					or drag to connect
				</div>
			</div>
		`;

		this.canvas.addEventListener('click', (e) => {
			this._jsPlumb.instance.fire('plusEndpointClick', params.endpoint, e);
		});

		this._jsPlumb.instance.appendElement(this.canvas);

		const container = this.canvas.querySelector('.plus-container');
		const message = container.querySelector('.drop-hover-message');

		this.setSuccessOutput = () => {
			this.canvas.classList.add('success');
		};

		this.clearSuccessOutput = () => {
			this.canvas.classList.remove('success');
		};

		this.paint = function (style, anchor) {
			const endpoint = params.endpoint;
			const connections = endpoint.connections;

			if (connections.length >= 1) {
				this.canvas.classList.add('hidden');
			}
			else {
				this.canvas.classList.remove('hidden');
				container.style.color = style.fill;
				container.style['border-color'] = style.fill;
				if (style.outlineStroke === 'hover') {
					message.style.display = 'inline';
				}
				else {
					message.style.display = 'none';
				}
			}
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
