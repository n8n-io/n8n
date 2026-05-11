<script setup lang="ts">
import { N8nButton, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { useUsersStore } from '@/features/settings/users/users.store';
import { useRouter } from 'vue-router';
import { AGENT_BUILDER_SETTINGS_VIEW } from '../constants';

const router = useRouter();

const i18n = useI18n();
const usersStore = useUsersStore();

const isAdmin = computed(() => usersStore.isInstanceOwner);

function onConfigure() {
	void router.push({ name: AGENT_BUILDER_SETTINGS_VIEW });
}
</script>

<template>
	<div :class="$style.container" data-test-id="agent-builder-unconfigured">
		<div :class="$style.iconWrap">
			<N8nIcon icon="settings" :size="32" />
		</div>
		<N8nHeading tag="h2" size="medium">
			{{ i18n.baseText('agents.builder.unconfigured.title') }}
		</N8nHeading>
		<N8nText size="medium" color="text-light" :class="$style.description">
			{{
				isAdmin
					? i18n.baseText('agents.builder.unconfigured.description.admin')
					: i18n.baseText('agents.builder.unconfigured.description.nonAdmin')
			}}
		</N8nText>
		<N8nButton v-if="isAdmin" type="primary" size="medium" @click="onConfigure">
			{{ i18n.baseText('agents.builder.unconfigured.cta') }}
		</N8nButton>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xl);
	margin: auto;
	max-width: 480px;
	text-align: center;
}

.iconWrap {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 64px;
	height: 64px;
	border-radius: 50%;
	background: var(--color--background--light-2);
	color: var(--color--text--tint-1);
	margin-bottom: var(--spacing--xs);
}

.description {
	margin-bottom: var(--spacing--xs);
}
</style>
