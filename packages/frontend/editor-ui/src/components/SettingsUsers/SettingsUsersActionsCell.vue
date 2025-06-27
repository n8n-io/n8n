<script lang="ts" setup="">
import type { UsersList } from '@n8n/api-types';
import type { UserAction } from '@n8n/design-system';
import type { IUser } from '@/Interface';

const props = defineProps<{
	data: UsersList['items'][number];
	actions: Array<UserAction<IUser>>;
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
		<N8nActionToggle
			v-if="!props.data.isOwner && props.data.signInType !== 'ldap' && props.actions.length > 0"
			placement="bottom"
			:actions="props.actions"
			theme="dark"
			@action="onUserAction"
		/>
	</div>
</template>

<style lang="scss" module></style>
