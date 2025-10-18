<script setup lang="ts">
import { useUsersStore } from '@/features/settings/users/users.store';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, useCssModule } from 'vue';

interface Props {
	box?: boolean;
}

const props = defineProps<Props>();

const $style = useCssModule();

const i18n = useI18n();
const ownerEmailList = computed(() =>
	useUsersStore()
		.allUsers.filter((user) => user.role?.includes('owner'))
		.map((user) => user.email),
);

const classes = computed(() => ({
	[$style.contactOwnerHint]: true,
	[$style.border]: props.box,
}));
</script>

<template>
	<div :class="classes">
		<N8nIcon v-if="props.box" color="text-light" icon="info" size="large" />
		<N8nText color="text-base" size="medium">
			<div style="padding-bottom: 8px">
				{{ i18n.baseText('communityNodeInfo.contact.admin') }}
			</div>
			<N8nText v-if="ownerEmailList.length" bold>
				{{ ownerEmailList.join(', ') }}
			</N8nText>
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.contactOwnerHint {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs);
	border-radius: 0.25em;
}

.border {
	border: var(--border-width) solid var(--color--foreground);
}
</style>
