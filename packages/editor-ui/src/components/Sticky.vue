<template>
	<div class="node-wrapper" :style="nodePosition">
		<div class="select-sticky-background" v-show="isSelected"></div>
		<div :class="{'node-default': true, 'touch-active': isTouchActive, 'is-touch-device': isTouchDevice}" :data-name="data.name" :ref="data.name">
			<div :class="nodeClass" :style="nodeStyle"  @click="setNodeActive" @click.left="mouseLeftClick" v-touch:start="touchStart" v-touch:end="touchEnd">
				<n8n-sticky 
					:content.sync="parameters.content"
					@onHeightChange="onHeightChange"
          @onWidthChange="onWidthChange"
					@onTopChange="onTopChange"
					@onLeftChange="onLeftChange"
				/>
			</div>

			<div class="node-options no-select-on-click" v-show="!hideActions">
				<div v-touch:tap="deleteNode" class="option" :title="$locale.baseText('node.deleteNode')" >
					<font-awesome-icon icon="trash" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';
import { externalHooks } from '@/components/mixins/externalHooks';
import { nodeBase } from '@/components/mixins/nodeBase';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';

import {
	INodeTypeDescription,
} from 'n8n-workflow';

import NodeIcon from '@/components/NodeIcon.vue';

import mixins from 'vue-typed-mixins';

import { getStyleTokenValue } from './helpers';
import { INodeUi, XYPosition } from '@/Interface';

export default mixins(externalHooks, nodeBase, nodeHelpers, workflowHelpers).extend({
	name: 'Sticky',
	components: {
		NodeIcon,
	},
	computed: {
		nodeType (): INodeTypeDescription | null {
			return this.data && this.$store.getters.nodeType(this.data.type, this.data.typeVersion);
		},
		node (): INodeUi | undefined { // same as this.data but reactive..
			return this.$store.getters.nodesByName[this.name] as INodeUi | undefined;
		},
		nodeClass (): object {
			return {
				'sticky-box': true,
				disabled: this.data.disabled,
			};
		},
		position (): XYPosition {
			if (this.node) {
				return this.node.position;
			} else {
				return [0, 0];
			}
		},
		nodePosition (): object {
			const returnStyles: {
				[key: string]: string;
			} = {
				left: this.position[0] + 'px',
				top: this.position[1] + 'px',
			};

			return returnStyles;
		},
		nodeStyle (): object {
			let borderColor = getStyleTokenValue('--color-foreground-xdark');

			if (this.data.disabled) {
				borderColor = getStyleTokenValue('--color-foreground-base');
			}

			const returnStyles: {
				[key: string]: string;
			} = {
				'border-color': borderColor,
			};

			return returnStyles;
		},
		isSelected (): boolean {
			return this.$store.getters.getSelectedNodes.find((node: INodeUi) => node.name === this.data.name);
		},
 	},
	data () {
		return {
			isTouchActive: false,
		};
	},
	methods: {
		deleteNode () {
			this.$telemetry.track('User clicked node hover button', { node_type: this.data.type, button_name: 'delete', workflow_id: this.$store.getters.workflowId });

			Vue.nextTick(() => {
				// Wait a tick else vue causes problems because the data is gone
				this.$emit('removeNode', this.data.name);
			});
		},
		setNodeActive () {
			this.$store.commit('setActiveNode', this.data.name);
		},
		touchStart () {
			if (this.isTouchDevice === true && this.isMacOs === false && this.isTouchActive === false) {
				this.isTouchActive = true;
				setTimeout(() => {
					this.isTouchActive = false;
				}, 2000);
			}
		},
		// onHeightChange(height: number) {
		// 	const sticky_background = document.querySelector('.select-sticky-background');
		// 	if (sticky_background) {
		// 		sticky_background.style.height = height + 16 + 'px';
		// 	}
		// },
		// onWidthChange(width: number) {
		// 	const sticky_background = document.querySelector('.select-sticky-background');
		// 	if (sticky_background) {
		// 		sticky_background.style.width = width + 16 + 'px';
		// 	}
		// },
		// onTopChange(top: number) {
		// 	const sticky_background = document.querySelector('.select-sticky-background');
		// 	if (sticky_background) {
		// 		sticky_background.style.top = top;
		// 	}
		// },
		// onLeftChange(left: number) {
		// 	const sticky_background = document.querySelector('.select-sticky-background');
		// 	if (sticky_background) {
		// 		sticky_background.style.left = left;
		// 	}
		// },
	},
});

</script>

<style lang="scss" scoped>

.node-wrapper {
	position: absolute;
	width: 100px;
	height: 100px;

	.node-description {
		position: absolute;
		top: 100px;
		left: -50px;
		line-height: 1.5;
		text-align: center;
		cursor: default;
		padding: 8px;
		width: 200px;
		pointer-events: none; // prevent container from being draggable

		.node-name > p { // must be paragraph tag to have two lines in safari
			text-overflow: ellipsis;
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2;
			overflow: hidden;
			overflow-wrap: anywhere;
			font-weight: var(--font-weight-bold);
			line-height: var(--font-line-height-compact);
		}
	}

	.node-default {
		position: absolute;
		width: 100%;
		height: 100%;
		cursor: pointer;

		.sticky-box {
			width: 100%;
			height: 100%;

			&.executing {
				background-color: $--color-primary-light !important;

				.node-executing-info {
					display: inline-block;
				}
			}
		}

		&.touch-active,
		&:hover {
			.node-execute {
				display: initial;
			}

			.node-options {
				display: initial;
			}
		}

		.node-executing-info {
			display: none;
			position: absolute;
			left: 0px;
			top: 0px;
			z-index: 12;
			width: 100%;
			height: 100%;
			font-size: 3.75em;
			line-height: 1.65em;
			text-align: center;
			color: rgba($--color-primary, 0.7);
		}

		.node-icon {
			position: absolute;
			top: calc(50% - 20px);
			left: 100%;
		}

		.node-info-icon {
			position: absolute;
			bottom: 6px;
			right: 6px;

			&.shift-icon {
				right: 12px;
			}

			.data-count {
				font-weight: 600;
				color: var(--color-success);
			}

			.node-issues {
				color: var(--color-danger);
			}

			.items-count {
				font-size: var(--font-size-s);
			}
		}

		.node-options {
			display: none;
			position: absolute;
			top: -25px;
			left: 100%;
			width: 240px;
			height: 26px;
			font-size: 0.9em;
			text-align: left;
			z-index: 10;
			color: #aaa;
			text-align: center;

			.option {
				width: 28px;
				display: inline-block;

				&.touch {
					display: none;
				}

				&:hover {
					color: $--color-primary;
				}

				.execute-icon {
					position: relative;
					top: 2px;
					font-size: 1.2em;
				}
			}
		}

		&.is-touch-device .node-options {
			left: -25px;
			width: 150px;

			.option.touch {
				display: initial;
			}
		}
	}
}

.select-sticky-background {
	display: block;
	background-color: hsla(var(--color-foreground-base-h), var(--color-foreground-base-s), var(--color-foreground-base-l), 60%);
	border-radius: var(--border-radius-xlarge);
	overflow: hidden;
	position: absolute;
	left: -8px;
	top: -8px;
	height: 176px;
	width: 256px;
}
</style>

<style lang="scss">
.jtk-endpoint {
	z-index: 2;
}

.node-trigger-tooltip {
	&__wrapper {
		top: -22px;
		left: 50px;
		position: relative;

		&--item {
			max-width: 160px;
			position: fixed;
			z-index: 0!important;
		}
	}
}

/** connector */
.jtk-connector {
	z-index: 3;
}

.jtk-connector path {
	transition: stroke .1s ease-in-out;
}

.jtk-connector.success {
	z-index: 4;
}

.jtk-connector.jtk-hover {
	z-index: 6;
}

.jtk-endpoint.plus-endpoint {
	z-index: 6;
}

.jtk-endpoint.dot-output-endpoint {
	z-index: 7;
}

.jtk-overlay {
	z-index: 7;
}

.disabled-linethrough {
	z-index: 8;
}

.jtk-connector.jtk-dragging {
	z-index: 8;
}

.jtk-drag-active.dot-output-endpoint, .jtk-drag-active.rect-input-endpoint {
	z-index: 9;
}

.connection-actions {
	z-index: 10;
}

.node-options {
	z-index: 10;
}

.drop-add-node-label {
	z-index: 10;
}

</style>

<style lang="scss">
	$--stalklength: 40px;
	$--box-size-medium: 24px;
	$--box-size-small: 18px;

	.plus-endpoint {
		cursor: pointer;

		.plus-stalk {
			border-top: 2px solid var(--color-foreground-dark);
			position: absolute;
			width: $--stalklength;
			height: 0;
			right: 100%;
			top: calc(50% - 1px);
			pointer-events: none;

		  .connection-run-items-label {
				position: relative;
				width: 100%;

				span {
					display: none;
					left: calc(50% + 4px);
				}
			}
		}

		.plus-container {
			color: var(--color-foreground-xdark);
			border: 2px solid var(--color-foreground-xdark);
			background-color: var(--color-background-xlight);
			border-radius: var(--border-radius-base);
			height: $--box-size-medium;
			width: $--box-size-medium;

			display: inline-flex;
			align-items: center;
			justify-content: center;
			font-size: var(--font-size-2xs);
			position: absolute;

			top: 0;
			right: 0;
			pointer-events: none;

			&.small {
				height: $--box-size-small;
				width: $--box-size-small;
				font-size: 8px;
			}

			.fa-plus {
				width: 1em;
			}
		}

		.drop-hover-message {
			font-weight: var(--font-weight-bold);
			font-size: var(--font-size-2xs);
			line-height: var(--font-line-height-regular);
			color: var(--color-text-light);

			position: absolute;
			top: -6px;
			left: calc(100% + 8px);
			width: 200px;
			display: none;
		}

		&.hidden > * {
			display: none;
		}

		&.success .plus-stalk {
			border-color: var(--color-success-light);

			span {
				display: inline;
			}
		}
	}
</style>
