import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { useFavoriteNavItems } from '@/features/collaboration/projects/composables/useFavoriteNavItems';
import { toCommandBarIcon } from '../commandBar.utils';
import type { CommandBarItem, CommandGroup } from '../types';

export function useFavoriteCommands(): CommandGroup {
	const i18n = useI18n();
	const router = useRouter();
	const favoritesStore = useFavoritesStore();
	const { favoriteGroups } = useFavoriteNavItems();

	const favoriteCommands = computed<CommandBarItem[]>(() =>
		favoriteGroups.value.flatMap(({ type, items }) =>
			items.flatMap(({ menuItem }) => {
				const location = menuItem.route?.to;
				if (!location) return [];

				const { href } = router.resolve(location);

				return {
					id: menuItem.id,
					title: menuItem.label,
					section: i18n.baseText('favorites.menu.title'),
					icon: toCommandBarIcon(menuItem.icon),
					href,
					handler: async () => {
						if (type === 'workflow') {
							window.location.href = href;
							return;
						}
						await router.push(location);
					},
				};
			}),
		),
	);

	return {
		commands: favoriteCommands,
		async initialize() {
			await favoritesStore.fetchFavorites();
		},
	};
}
