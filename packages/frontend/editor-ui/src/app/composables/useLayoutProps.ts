import { computed } from 'vue';
import { useRoute } from 'vue-router';

export function useLayoutProps() {
	const route = useRoute();

	const layoutProps = computed(() => {
		return route.meta.layoutProps ?? {};
	});

	return {
		layoutProps,
	};
}
