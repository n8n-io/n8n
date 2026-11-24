import { computed } from 'vue';
import { hasPermission } from '@/app/utils/rbac/permissions';

export function useTagPermissions() {
	const canList = computed(() => hasPermission(['rbac'], { rbac: { scope: 'tag:list' } }));
	const canCreate = computed(() => hasPermission(['rbac'], { rbac: { scope: 'tag:create' } }));
	const canUpdate = computed(() => hasPermission(['rbac'], { rbac: { scope: 'tag:update' } }));
	const canDelete = computed(() => hasPermission(['rbac'], { rbac: { scope: 'tag:delete' } }));

	/** True when the user can perform any write operation on tags */
	const canManage = computed(() => canCreate.value || canUpdate.value || canDelete.value);

	return { canList, canCreate, canUpdate, canDelete, canManage };
}

export function useAnnotationTagPermissions() {
	const canCreate = computed(() =>
		hasPermission(['rbac'], { rbac: { scope: 'annotationTag:create' } }),
	);
	const canUpdate = computed(() =>
		hasPermission(['rbac'], { rbac: { scope: 'annotationTag:update' } }),
	);
	const canDelete = computed(() =>
		hasPermission(['rbac'], { rbac: { scope: 'annotationTag:delete' } }),
	);

	/** True when the user can perform any write operation on annotation tags */
	const canManage = computed(() => canCreate.value || canUpdate.value || canDelete.value);

	return { canCreate, canUpdate, canDelete, canManage };
}
