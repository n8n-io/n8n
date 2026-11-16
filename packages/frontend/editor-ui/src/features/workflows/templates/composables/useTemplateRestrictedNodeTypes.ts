import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import {
	collectRestrictedNodeTypes,
	useTypeAvailability,
} from '@n8n/frontend-module-type-availability-policies';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

export function useTemplateRestrictedNodeTypes(
	template: MaybeRefOrGetter<ITemplatesWorkflowFull | null | undefined>,
	projectId: MaybeRefOrGetter<string | null | undefined>,
) {
	const nodeTypesStore = useNodeTypesStore();
	const { nodeTypeRestriction } = useTypeAvailability(projectId);

	const restrictedNodeTypes = computed(() => {
		const templateValue = toValue(template);
		if (!templateValue) return [];

		return collectRestrictedNodeTypes(
			(templateValue.workflow?.nodes ?? []).map((node) => node.type),
			(type) =>
				nodeTypesStore.getNodeType(type)?.displayName ??
				templateValue.nodes?.find((node) => node.name === type)?.displayName ??
				type,
			nodeTypeRestriction,
		);
	});

	return { restrictedNodeTypes };
}
