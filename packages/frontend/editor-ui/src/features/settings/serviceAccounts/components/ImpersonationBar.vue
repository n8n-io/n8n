<script lang="ts" setup>
import { N8nButton, N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';
import { useToast } from '@n8n/composables/useToast';
import { computed, ref } from 'vue';

import { useImpersonationStore } from '../impersonation.store';

const i18n = useI18n();
const toast = useToast();
const impersonationStore = useImpersonationStore();
const usersStore = useUsersStore();

const returning = ref(false);

const serviceAccountName = computed(
	() =>
		impersonationStore.serviceAccountName ??
		usersStore.currentUser?.firstName ??
		usersStore.currentUser?.email ??
		'',
);

const onReturn = async () => {
	returning.value = true;
	try {
		await impersonationStore.stop();
	} catch (error) {
		returning.value = false;
		toast.showError(error, i18n.baseText('impersonation.banner.return'));
	}
};
</script>

<template>
	<!--
		`v-if` is `isImpersonating` only — never the env feature flag. Flipping the
		flag off mid-session must not hide the only way out.

		Mounted as a sibling of `BannerStack`, not inside it: the stack renders only
		the single highest-priority banner and `BaseBanner` hard-wires a dismiss
		control. A trial banner must never be able to hide the exit, and neither
		should the user.
	-->
	<N8nCallout
		v-if="impersonationStore.isImpersonating"
		theme="warning"
		icon="user-round-key"
		:class="$style.bar"
		data-test-id="impersonation-bar"
	>
		{{
			i18n.baseText('impersonation.banner.message', {
				interpolate: {
					serviceAccount: serviceAccountName,
					actor: impersonationStore.actorName,
				},
			})
		}}
		<template #trailingContent>
			<N8nButton
				type="secondary"
				size="small"
				:loading="returning"
				:label="i18n.baseText('impersonation.banner.return')"
				data-test-id="impersonation-bar-return"
				@click="onReturn"
			/>
		</template>
	</N8nCallout>
</template>

<style lang="scss" module>
.bar {
	min-height: var(--banner--height);
	border-radius: 0;
	border-left: 0;
	border-right: 0;
	border-top: 0;
}
</style>
