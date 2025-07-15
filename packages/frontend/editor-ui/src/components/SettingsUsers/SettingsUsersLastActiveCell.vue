<script lang="ts" setup>
import { type UsersList } from '@n8n/api-types';

const props = defineProps<{ data: UsersList['items'][number] }>();
</script>

<template>
	<div>
		{{ props.data.lastActiveAt ? new Date(props.data.lastActiveAt).toLocaleDateString() : 'Never' }}
	</div>
</template>

<style lang="scss" module></style>
