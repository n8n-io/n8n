<template>
	<div class="n8n-node-icon">
		<div
			:class="{
				[$style['node-icon-wrapper']]: true,
				[$style['circle']]: this.circle,
				[$style['disabled']]: this.disabled,
			}"
			:style="iconStyleData"
			v-on="$listeners"
		>
			<n8n-tooltip placement="top" :disabled="!showTooltip">
				<template #content>{{ nodeTypeName }}</template>
				<div v-if="type !== 'unknown'" :class="$style['icon']">
					<img v-if="type === 'file'" :src="src" :class="$style['node-icon-image']" />
					<font-awesome-icon v-else :icon="name" :style="fontStyleData" />
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
		src: {
			type: String,
		},
		name: {
			type: String,
		},
		nodeTypeName: {
			type: String,
		},
		size: {
			type: Number,
		},
		disabled: {
			type: Boolean,
		},
		circle: {
			type: Boolean,
		},
		color: {
			type: String,
		},
		showTooltip: {
			type: Boolean,
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
	border-radius: var(--border-radius-small);
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

.circle {
	border-radius: 50%;
}

.disabled {
	color: '#ccc';
	-webkit-filter: contrast(40%) brightness(1.5) grayscale(100%);
			filter: contrast(40%) brightness(1.5) grayscale(100%);
}
</style>
