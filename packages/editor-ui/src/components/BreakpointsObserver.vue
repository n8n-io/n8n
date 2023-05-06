<template>
	<span>
		<slot v-bind:bp="bp" v-bind:value="value" />
	</span>
</template>

<script lang="ts">
import { BREAKPOINT_SM, BREAKPOINT_MD, BREAKPOINT_LG, BREAKPOINT_XL } from '@/constants';

/**
 * matching element.io https://element.eleme.io/#/en-US/component/layout#col-attributes
 * xs < 768
 * sm >= 768
 * md >= 992
 * lg >= 1200
 * xl >= 1920
 */

import mixins from 'vue-typed-mixins';
import { genericHelpers } from '@/mixins/genericHelpers';
import { debounceHelper } from '@/mixins/debounce';

export default mixins(genericHelpers, debounceHelper).extend({
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
			this.callDebounced('onResizeEnd', { debounceTime: 50 });
		},
		onResizeEnd() {
			this.$data.width = window.innerWidth;
		},
	},
	computed: {
		bp(): string {
			if (this.$data.width < BREAKPOINT_SM) {
				return 'XS';
			}

			if (this.$data.width >= BREAKPOINT_XL) {
				return 'XL';
			}

			if (this.$data.width >= BREAKPOINT_LG) {
				return 'LG';
			}

			if (this.$data.width >= BREAKPOINT_MD) {
				return 'MD';
			}

			return 'SM';
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value(): any | undefined {
			if (this.valueXS !== undefined && this.$data.width < BREAKPOINT_SM) {
				return this.valueXS;
			}

			if (this.valueXL !== undefined && this.$data.width >= BREAKPOINT_XL) {
				return this.valueXL;
			}

			if (this.valueLG !== undefined && this.$data.width >= BREAKPOINT_LG) {
				return this.valueLG;
			}

			if (this.valueMD !== undefined && this.$data.width >= BREAKPOINT_MD) {
				return this.valueMD;
			}

			if (this.valueSM !== undefined) {
				return this.valueSM;
			}

			return this.valueDefault;
		},
	},
});
</script>
