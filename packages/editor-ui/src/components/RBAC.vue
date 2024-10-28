<script lang="ts">
import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import { useRBACStore } from '@/stores/rbac.store';
import type { ScopeMode, Scope, Resource } from '@n8n/permissions';
import {
	inferProjectIdFromRoute,
	inferResourceIdFromRoute,
	inferResourceTypeFromRoute,
} from '@/utils/rbacUtils';
import { useRoute } from 'vue-router';

export default defineComponent({
	props: {
		scope: {
			type: [String, Array] as PropType<Scope | Scope[]>,
			required: true,
		},
		mode: {
			type: String as PropType<ScopeMode>,
			default: 'allOf',
		},
		resourceType: {
			type: String as PropType<Resource>,
			default: undefined,
		},
		resourceId: {
			type: String,
			default: undefined,
		},
		projectId: {
			type: String,
			default: undefined,
		},
	},
	setup(props, { slots }) {
		const rbacStore = useRBACStore();
		const route = useRoute();

		const hasScope = computed(() => {
			const projectId = props.projectId ?? inferProjectIdFromRoute(route);
			const resourceType = props.resourceType ?? inferResourceTypeFromRoute(route);
			const resourceId = resourceType
				? props.resourceId ?? inferResourceIdFromRoute(route)
				: undefined;

			return rbacStore.hasScope(
				props.scope,
				{
					projectId,
					resourceType,
					resourceId,
				},
				{ mode: props.mode },
			);
		});

		return () => (hasScope.value ? slots.default?.() : slots.fallback?.());
	},
});
</script>
