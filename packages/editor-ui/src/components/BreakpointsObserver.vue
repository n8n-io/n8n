<template>
	<span>
		<slot :bp="bp" :value="value" />
	</span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { BREAKPOINT_SM, BREAKPOINT_MD, BREAKPOINT_LG, BREAKPOINT_XL } from '@/constants';

/**
 * matching element.io https://element.eleme.io/#/en-US/component/layout#col-attributes
 * xs < 768
 * sm >= 768
 * md >= 992
 * lg >= 1200
 * xl >= 1920
 */

import { useUIStore } from '@/stores/ui.store';
import { getBannerRowHeight } from '@/utils/htmlUtils';
import { useDebounce } from '@/composables/useDebounce';

export default defineComponent({
	name: 'BreakpointsObserver',
	props: ['valueXS', 'valueXL', 'valueLG', 'valueMD', 'valueSM', 'valueDefault'],
	setup() {
		const { callDebounced } = useDebounce();
		return { callDebounced };
	},
	data() {
		return {
			width: window.innerWidth,
		};
	},
	computed: {
		bp(): string {
			if (this.width < BREAKPOINT_SM) {
				return 'XS';
			}

			if (this.width >= BREAKPOINT_XL) {
				return 'XL';
			}

			if (this.width >= BREAKPOINT_LG) {
				return 'LG';
			}

			if (this.width >= BREAKPOINT_MD) {
				return 'MD';
			}

			return 'SM';
		},

		value(): number | undefined {
			if (this.valueXS !== undefined && this.width < BREAKPOINT_SM) {
				return this.valueXS;
			}

			if (this.valueXL !== undefined && this.width >= BREAKPOINT_XL) {
				return this.valueXL;
			}

			if (this.valueLG !== undefined && this.width >= BREAKPOINT_LG) {
				return this.valueLG;
			}

			if (this.valueMD !== undefined && this.width >= BREAKPOINT_MD) {
				return this.valueMD;
			}

			if (this.valueSM !== undefined) {
				return this.valueSM;
			}

			return this.valueDefault;
		},
	},
	created() {
		window.addEventListener('resize', this.onResize);
	},
	beforeUnmount() {
		window.removeEventListener('resize', this.onResize);
	},
	methods: {
		onResize() {
			void this.callDebounced(this.onResizeEnd, { debounceTime: 50 });
		},
		async onResizeEnd() {
			this.width = window.innerWidth;
			await this.$nextTick();

			const bannerHeight = await getBannerRowHeight();
			useUIStore().updateBannersHeight(bannerHeight);
		},
	},
});
</script>
