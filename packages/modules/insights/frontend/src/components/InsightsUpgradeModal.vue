<script setup lang="ts">
import { N8nButton, N8nDialog, N8nDialogBody, N8nDialogFooter, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { useBasePageRedirectionHelper } from '@n8n/stores/composables/useBasePageRedirectionHelper';
import { computed } from 'vue';
const model = defineModel<boolean>();
const i18n = useI18n();

function goToUpgrade() {
	model.value = false;
	void useBasePageRedirectionHelper().goToUpgrade('insights', 'upgrade-insights');
}

const perks = computed(() =>
	[...Array(3).keys()].map((index) =>
		i18n.baseText(`insights.upgradeModal.perks.${index}` as BaseTextKey),
	),
);
</script>

<template>
	<N8nDialog
		v-model:open="model"
		size="medium"
		:header="i18n.baseText('insights.upgradeModal.title')"
	>
		<N8nDialogBody>
			<N8nText tag="p">
				{{ i18n.baseText('insights.upgradeModal.content') }}
			</N8nText>
			<ul :class="$style.perks">
				<N8nText v-for="perk in perks" :key="perk" color="text-dark" tag="li">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16px" height="16px">
						<path
							d="M 16 8 C 16 12.418 12.418 16 8 16 C 3.582 16 0 12.418 0 8 C 0 3.582 3.582 0 8 0 C 12.418 0 16 3.582 16 8 Z M 3.97 9.03 L 5.97 11.03 L 6.5 11.561 L 7.03 11.03 L 12.53 5.53 L 11.47 4.47 L 6.5 9.439 L 5.03 7.97 L 3.97 9.03 Z"
							fill="currentColor"
						/>
					</svg>
					{{ perk }}
				</N8nText>
			</ul>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="subtle" @click="model = false">
				{{ i18n.baseText('insights.upgradeModal.button.dismiss') }}
			</N8nButton>
			<N8nButton variant="solid" @click="goToUpgrade">
				{{ i18n.baseText('generic.upgrade') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module>
.perks {
	margin: var(--spacing--sm) 0 0;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);

	> li {
		display: flex;
		align-items: center;
		gap: var(--spacing--2xs);
	}
}
</style>
