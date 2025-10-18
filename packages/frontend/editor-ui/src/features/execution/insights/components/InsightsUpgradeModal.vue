<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import type { BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';

import { N8nButton, N8nText } from '@n8n/design-system';
import { ElDialog } from 'element-plus';
const model = defineModel<boolean>();
const i18n = useI18n();

function goToUpgrade() {
	model.value = false;
	void usePageRedirectionHelper().goToUpgrade('insights', 'upgrade-insights');
}

const perks = computed(() =>
	[...Array(3).keys()].map((index) =>
		i18n.baseText(`insights.upgradeModal.perks.${index}` as BaseTextKey),
	),
);
</script>

<template>
	<ElDialog v-model="model" :title="i18n.baseText('insights.upgradeModal.title')" width="500">
		<div>
			<N8nText tag="p" class="mb-s">
				{{ i18n.baseText('insights.upgradeModal.content') }}
			</N8nText>
			<ul class="perks-list">
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
		</div>
		<template #footer>
			<div>
				<N8nButton type="secondary" @click="model = false">
					{{ i18n.baseText('insights.upgradeModal.button.dismiss') }}
				</N8nButton>
				<N8nButton type="primary" @click="goToUpgrade">
					{{ i18n.baseText('generic.upgrade') }}
				</N8nButton>
			</div>
		</template>
	</ElDialog>
</template>

<style scoped>
.perks-list {
	margin: 0;
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
