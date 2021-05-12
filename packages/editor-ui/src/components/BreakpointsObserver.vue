<template>
	<span>
		<slot v-bind:size="size" v-bind:value="value" />
	</span>
</template>

<script lang="ts">

import {
	BREAKPOINT_SM,
	BREAKPOINT_MD,
	BREAKPOINT_LG,
  BREAKPOINT_XL,
} from '@/constants';

/**
 * matching element.io https://element.eleme.io/#/en-US/component/layout#col-attributes
 * xs < 768
 * sm >= 768
 * md >= 992
 * lg >= 1200
 * xl >= 1920
 */

import mixins from 'vue-typed-mixins';
import { genericHelpers } from '@/components/mixins/genericHelpers';

const sizes = ["XS", "XL", "LG", "MD", "SM", 'Default'];

export default mixins(
	genericHelpers,
)
	.extend({
	name: 'BreakpointsObserver',
	props: ['valueXS', 'valueXL', 'valueLG', 'valueMD', 'valueSM', 'valueDefault'],
	data() {
		return {
			width: window.innerWidth,
		};
	},
	created() {
		window.addEventListener('resize', this.onResize);
	},
	beforeDestroy() {
		window.removeEventListener('resize', this.onResize);
	},
	methods: {
		onResize() {
			this.callDebounced('onResizeEnd', 250);
		},
		onResizeEnd() {
			this.$data.width = window.innerWidth;
		},
	},
	computed: {
		size(): string {
			if (this.$data.width < BREAKPOINT_SM) {
				return "XS";
			}

			if (this.$data.width >= BREAKPOINT_XL) {
				return "XL";
			}

			if (this.$data.width >= BREAKPOINT_LG) {
				return "LG";
			}

			if (this.$data.width >= BREAKPOINT_MD) {
				return "MD";
			}

			return "SM";
		},
		value(): any | undefined {
			for (const i in sizes) {
				const key = `value${sizes[i]}`;
				if (this.size === sizes[i] && this.$props.hasOwnProperty(key)) {
					return this.$props[key];
				}
			}

			return;
		},
	},
});
</script>