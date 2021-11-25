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
		this.label = '';
		this.labelOffset = 0;
		this.size = 'medium';
		this.showOutputLabel = true;

		const boxSize = {
			medium: 24,
			small: 18,
		};
		const stalkLength = 40;
		const verticalOffset = {
			medium: 12,
			small: 9,
		};

		DOMElementEndpoint.apply(this, arguments);

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
					width: ${stalkLength}px;
					height: 0;
					right: 100%;
					top: calc(50% - 1px);
					pointer-events: none;
				}

				.plus-stalk .connection-run-items-label {
					position: relative;
					width: 100%;
				}

				.plus-stalk .connection-run-items-label span {
					display: none;
					left: calc(50% + 4px);
					transform: translateX(-50%);
				}

				.plus-container {
					color: var(--color-foreground-xdark);
					border: 2px solid var(--color-foreground-xdark);
					background-color: var(--color-background-xlight);
					border-radius: var(--border-radius-base);
					height: ${boxSize.medium}px;
					width: ${boxSize.medium}px;

					display: inline-flex;
					align-items: center;
					justify-content: center;
					font-size: var(--font-size-2xs);
					position: absolute;

					top: 0;
					right: 0;
					pointer-events: none;
				}

				.plus-container.small {
					height: ${boxSize.small}px;
					width: ${boxSize.small}px;
					font-size: 8px;
				}

				.plus-container svg {
					width: 1em;
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

				.success .plus-stalk span {
					display: inline;
				}
			</style>

			<div class="plus-stalk">
				<div class="connection-run-items-label">
					<span class="floating"></span>
				</div>
			</div>

			<div class="plus-container">
				<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="plus" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="svg-inline--fa fa-plus">
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
		const plusStalk = this.canvas.querySelector('.plus-stalk');
		const successOutput = this.canvas.querySelector('.plus-stalk span');

		this.setSuccessOutput = (output, repaint = true) => {
			this.canvas.classList.add('success');
			if (this.showOutputLabel) {
				successOutput.textContent = output;
				this.label = output;
				this.labelOffset = successOutput.offsetWidth;
			}
			else {
				this.label = '';
				this.labelOffset = 24;
			}

			plusStalk.style.width = `${stalkLength + this.labelOffset}px`;
			if (repaint && !this._jsPlumb && this._jsPlumb.instance && this._jsPlumb.instance.isSuspendDrawing()) {
				params.endpoint.repaint(); // force rerender to move plus hoverable/draggable space
			}
		};

		this.clearSuccessOutput = () => {
			this.canvas.classList.remove('success');
			successOutput.textContent = '';
			this.label = '';
			this.labelOffset = 0;
			plusStalk.style.width = `${stalkLength}px`;
			params.endpoint.repaint();
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
				if (style.hover) {
					message.style.display = 'inline';
				}
				else {
					message.style.display = 'none';
				}
			}
			_ju.sizeElement(this.canvas, this.x, this.y, this.w, this.h);
		};

		this._compute = (anchorPoint, orientation, endpointStyle, connectorPaintStyle) => {
			this.size = endpointStyle.size || this.size;
			this.showOutputLabel = !!endpointStyle.showOutputLabel;

			if (this.size !== 'medium') {
				container.classList.add(this.size);
			}

			const endpoint = params.endpoint;
			const connections = endpoint.connections;
			setTimeout(() => {
				if (this.label && !this.labelOffset) { // if label is hidden, offset is 0 so recalculate
					this.setSuccessOutput(this.label, true);
				}
			}, 0);

			if (connections.length >= 1) {
				return [anchorPoint[0] + stalkLength + this.labelOffset, anchorPoint[1] - verticalOffset[this.size], 0, 0];
			}

			return [anchorPoint[0] + stalkLength + this.labelOffset, anchorPoint[1] - verticalOffset[this.size], boxSize[this.size], boxSize[this.size]];
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
