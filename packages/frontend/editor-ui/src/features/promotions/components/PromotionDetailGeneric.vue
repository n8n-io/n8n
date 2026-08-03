<script lang="ts" setup>
import type { PromotionSummary } from '@n8n/api-types';
import { N8nButton, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';

import { useToast } from '@/app/composables/useToast';
import PromotionStateBadge from '@/features/promotions/components/PromotionStateBadge.vue';
import { usePromotionsStore } from '@/features/promotions/promotions.store';

const props = defineProps<{
	promotion: PromotionSummary;
}>();

const i18n = useI18n();
const toast = useToast();
const promotionsStore = usePromotionsStore();

const acting = ref(false);
const syncing = ref(false);

/**
 * Fallback journey for models without a dedicated UI: raw state plus the
 * actions the model reports. Payload-taking actions need model-specific
 * screens and are not offered here.
 */
async function runAction(action: string) {
	acting.value = true;
	try {
		await promotionsStore.runAction(props.promotion.id, action);
	} catch (error) {
		toast.showError(error, i18n.baseText('promotions.action.error'));
	} finally {
		acting.value = false;
	}
}

async function onSync() {
	syncing.value = true;
	try {
		await promotionsStore.sync(props.promotion.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('promotions.sync.error'));
	} finally {
		syncing.value = false;
	}
}
</script>

<template>
	<div :class="$style.detail" data-test-id="promotion-detail-generic">
		<div :class="$style.row">
			<PromotionStateBadge :state="promotion.state" />
			<N8nText color="text-light" size="small">{{ promotion.model }}</N8nText>
			<N8nTooltip :content="i18n.baseText('promotions.sync.tooltip')" placement="top">
				<N8nIconButton
					icon="refresh-cw"
					type="tertiary"
					size="small"
					:loading="syncing"
					@click="onSync"
				/>
			</N8nTooltip>
		</div>
		<N8nText size="small" tag="div">
			{{ promotion.unitOfWork.type }} · {{ promotion.unitOfWork.id }} ·
			{{
				i18n.baseText(
					promotion.role === 'source' ? 'promotions.role.source' : 'promotions.role.destination',
				)
			}}
		</N8nText>
		<div v-if="promotion.availableActions.length > 0" :class="$style.actions">
			<N8nButton
				v-for="action in promotion.availableActions"
				:key="action"
				:label="action"
				:disabled="acting"
				size="small"
				type="secondary"
				@click="runAction(action)"
			/>
		</div>
		<N8nText v-else color="text-light" size="small" tag="div">
			{{ i18n.baseText('promotions.detail.noActions') }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.detail {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
