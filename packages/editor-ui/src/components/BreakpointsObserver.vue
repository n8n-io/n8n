<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { BREAKPOINT_SM, BREAKPOINT_MD, BREAKPOINT_LG, BREAKPOINT_XL } from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { getBannerRowHeight } from '@/utils/htmlUtils';
import { useDebounce } from '@/composables/useDebounce';

/**
 * matching element.io https://element.eleme.io/#/en-US/component/layout#col-attributes
 * xs < 768
 * sm >= 768
 * md >= 992
 * lg >= 1200
 * xl >= 1920
 */
interface Props {
	valueXS?: number;
	valueXL?: number;
	valueLG?: number;
	valueMD?: number;
	valueSM?: number;
	valueDefault?: number;
}

const props = defineProps<Props>();

const { callDebounced } = useDebounce();
const uiStore = useUIStore();

const width = ref(window.innerWidth);

const bp = computed(() => {
	if (width.value < BREAKPOINT_SM) {
		return 'XS';
	}
	if (width.value >= BREAKPOINT_XL) {
		return 'XL';
	}
	if (width.value >= BREAKPOINT_LG) {
		return 'LG';
	}
	if (width.value >= BREAKPOINT_MD) {
		return 'MD';
	}
	return 'SM';
});

const value = computed(() => {
	if (props.valueXS && width.value < BREAKPOINT_SM) {
		return props.valueXS;
	}
	if (props.valueXL && width.value >= BREAKPOINT_XL) {
		return props.valueXL;
	}
	if (props.valueLG && width.value >= BREAKPOINT_LG) {
		return props.valueLG;
	}
	if (props.valueMD && width.value >= BREAKPOINT_MD) {
		return props.valueMD;
	}
	if (props.valueSM) {
		return props.valueSM;
	}
	return props.valueDefault;
});

const onResize = () => {
	void callDebounced(onResizeEnd, { debounceTime: 50 });
};

const onResizeEnd = async () => {
	width.value = window.innerWidth;
	await nextTick();

	const bannerHeight = await getBannerRowHeight();
	uiStore.updateBannersHeight(bannerHeight);
};

onMounted(() => {
	window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
	window.removeEventListener('resize', onResize);
});
</script>

<template>
	<span>
		<slot :bp="bp" :value="value" />
	</span>
</template>
