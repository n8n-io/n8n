import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import {
	useNodeTypeRestriction,
	useTypeAvailability,
} from '@n8n/frontend-module-type-availability-policies';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

/** Loads the policy that applies to chat tools and reports whether `nodeType` is restricted. */
export function useChatToolRestriction(nodeType: MaybeRefOrGetter<string | null | undefined>) {
	const nodeTypesStore = useNodeTypesStore();
	const projectsStore = useProjectsStore();

	// Chat tools run as workflows in the personal project, so that project's policy applies.
	useTypeAvailability(() => projectsStore.personalProject?.id);

	const { isRestricted, restriction } = useNodeTypeRestriction(nodeType);

	const typeName = computed(() => {
		const name = toValue(nodeType);
		if (!name) return '';
		return nodeTypesStore.getNodeType(name)?.displayName ?? name;
	});

	return { isRestricted, restriction, typeName };
}
