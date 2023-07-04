<template>
	<div class="n8n-node-icon">
		<div
			:class="{
				[$style.nodeIconWrapper]: true,
				[$style.circle]: circle,
				[$style.disabled]: disabled,
			}"
			:style="iconStyleData"
			v-on="$listeners"
		>
			<!-- ElementUI tooltip is prone to memory-leaking so we only render it if we really need it -->
			<n8n-tooltip placement="top" :disabled="!showTooltip" v-if="showTooltip">
				<template #content>{{ nodeTypeName }}</template>
				<div v-if="type !== 'unknown'" :class="$style.icon">
					<img v-if="type === 'file'" :src="src" :class="$style.nodeIconImage" />
					<font-awesome-icon v-else :icon="name" :class="$style.iconFa" :style="fontStyleData" />
				</div>
				<div v-else :class="$style.nodeIconPlaceholder">
					{{ nodeTypeName ? nodeTypeName.charAt(0) : '?' }}
					?
				</div>
			</n8n-tooltip>
			<template v-else>
				<div v-if="type !== 'unknown'" :class="$style.icon">
					<img v-if="type === 'file'" :src="src" :class="$style.nodeIconImage" />
					<font-awesome-icon v-else :icon="name" :style="fontStyleData" />
				</div>
				<div v-else :class="$style.nodeIconPlaceholder">
					{{ nodeTypeName ? nodeTypeName.charAt(0) : '?' }}
					?
				</div>
			</template>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import N8nTooltip from '../N8nTooltip';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

export default defineComponent({
	name: 'n8n-node-icon',
	components: {
		N8nTooltip,
		FontAwesomeIcon,
	},
	props: {
		type: {
			type: String,
			required: true,
			validator: (value: string): boolean => ['file', 'icon', 'unknown'].includes(value),
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
		iconStyleData(): Record<string, string> {
			if (!this.size) {
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
		fontStyleData(): Record<string, string> {
			if (!this.size) {
				return {};
			}

			return {
				'max-width': `${this.size}px`,
			};
		},
	},
});
</script>

<style lang="scss" module>
.nodeIconWrapper {
	width: var(--node-icon-size, 26px);
	height: var(--node-icon-size, 26px);
	border-radius: var(--border-radius-small);
	color: var(--node-icon-color, #444);
	line-height: var(--node-icon-size, 26px);
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
	pointer-events: none;

	svg {
		max-width: 100%;
		max-height: 100%;
	}
}
.nodeIconPlaceholder {
	text-align: center;
}
.nodeIconImage {
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
