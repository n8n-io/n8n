<script lang="ts" setup="">
import type { UsersList } from '@n8n/api-types';

import { N8nDropdown } from '@n8n/design-system';
const props = defineProps<{
	data: UsersList['items'][number];
	actions: Array<{ label: string; value: string; disabled?: boolean }>;
}>();

const emit = defineEmits<{
	action: [value: { action: string; userId: string }];
}>();

const onUserAction = (action: string) => {
	emit('action', {
		action,
		userId: props.data.id,
	});
};
</script>

<template>
	<div>
		<N8nDropdown
			v-if="props.data.signInType !== 'ldap' && props.actions.length > 0"
			:actions="props.actions"
			@action="onUserAction"
		/>
	</div>
</template>
