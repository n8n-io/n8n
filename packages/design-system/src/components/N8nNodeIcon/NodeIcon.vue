<template>
	<div>
		<div
			:class="$style['node-icon-wrapper']"
			:style="iconStyleData"
			@click="(e) => $emit('click')"
		>
			<n8n-tooltip placement="top" :disabled="!showTooltip">
				<div slot="content" v-text="nodeTypeName"></div>
				<div v-if="type !== 'unknown'" :class="$style['icon']">
					<img v-if="type === 'file'" :src="path" :class="$style['node-icon-image']" />
					<font-awesome-icon v-else :icon="path" :style="fontStyleData" />
				</div>
				<div v-else :class="$style['node-icon-placeholder']">
					{{ nodeTypeName? nodeTypeName.charAt(0) : '?' }}
					?
				</div>
			</n8n-tooltip>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nTooltip from '../N8nTooltip';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

export default Vue.extend({
	name: 'n8n-node-icon',
	components: {
		N8nTooltip,
		FontAwesomeIcon,
	},
	props: {
		type: {
			type: String,
			required: true,
			validator: (value: string): boolean =>
				['file', 'icon', 'unknown'].includes(value),
		},
		path: {
			type: String,
			required: true,
		},
		nodeTypeName: {
			type: String,
			required: false,
		},
		size: {
			type: Number,
			required: false,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		circle: {
			type: Boolean,
			default: false,
		},
		color: {
			type: String,
			required: false,
		},
		showTooltip: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		iconStyleData (): object {
			if(!this.size) {
				return {
					color: this.color || '',
				};
			}
			return {
				color: this.color || '',
				width: `${this.size}px`,
				height: `${this.size}px`,
				'font-size': `${this.size}px`,
				'line-height': `${this.size}px`,
				'border-radius': this.circle ? '50%': '2px',
				...(this.disabled && {
					color: '#ccc',
					'-webkit-filter': 'contrast(40%) brightness(1.5) grayscale(100%)',
					'filter': 'contrast(40%) brightness(1.5) grayscale(100%)',
				}),
			};
		},
		fontStyleData (): object {
			return {
				'max-width': `${this.size}px`,
			};
		},
	},
});
</script>

<style lang="scss" module>
.node-icon-wrapper {
	width: 26px;
	height: 26px;
	border-radius: 2px;
	color: #444;
	line-height: 26px;
	font-size: 1.1em;
	overflow: hidden;
	text-align: center;
	font-weight: bold;
	font-size: 20px;
}

.icon {
	height: 100%;
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
}

.node-icon-placeholder {
	text-align: center;
}

.node-icon-image {
	width: 100%;
	max-width: 100%;
	max-height: 100%;
}
</style>
