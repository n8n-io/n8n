import { computed, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/constants';

export const useOverview = () => {
	const route = useRoute();

	const isOverviewSubPage = computed(
		() =>
			route.name === VIEWS.WORKFLOWS ||
			route.name === VIEWS.HOMEPAGE ||
			route.name === VIEWS.CREDENTIALS ||
			route.name === VIEWS.EXECUTIONS ||
			route.name === VIEWS.FOLDERS,
	);

	return reactive({
		isOverviewSubPage,
	});
};
