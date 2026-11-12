import { ref, watch, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import type { PathItem } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { getFolderPath } from '@/features/core/folders/folders.api';
import { PROJECT_AGENTS } from '../constants';

export function useAgentFolderBreadcrumb(
	projectId: Ref<string>,
	parentFolderId: Ref<string | null | undefined>,
) {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const router = useRouter();
	const items = ref<PathItem[]>([]);

	watch(
		[projectId, parentFolderId],
		async ([project, folderId], _, onCleanup) => {
			let current = true;
			onCleanup(() => {
				current = false;
			});
			items.value = [];

			if (!project || !folderId || !settingsStore.isFoldersFeatureEnabled) {
				return;
			}

			try {
				const tree = await getFolderPath(rootStore.restApiContext, project, folderId);
				const path: PathItem[] = [];
				let node = tree[0];

				while (node) {
					path.push({
						id: node.id,
						label: node.name,
						href: router.resolve({
							name: PROJECT_AGENTS,
							params: { projectId: project },
							query: { folderId: node.id },
						}).href,
					});
					node = node.children[0];
				}

				if (current) {
					items.value = path;
				}
			} catch {
				// Folder access can be narrower than Agent access.
			}
		},
		{ immediate: true },
	);

	return items;
}
