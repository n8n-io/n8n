<script lang="ts" setup>
import type { PromotionSummary } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nLoading, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import TimeAgo from '@/app/components/TimeAgo.vue';
import PromotionStateBadge from '@/features/promotions/components/PromotionStateBadge.vue';

defineProps<{
	items: PromotionSummary[];
	selectedId: string | null;
	loading: boolean;
}>();

const emit = defineEmits<{
	select: [promotionId: string];
	new: [];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.sidebar" data-test-id="promotions-sidebar">
		<div :class="$style.header">
			<N8nText bold size="medium">
				{{ i18n.baseText('promotions.sidebar.title') }}
			</N8nText>
			<N8nButton
				size="small"
				icon="plus"
				data-test-id="promotions-new-button"
				:label="i18n.baseText('promotions.sidebar.new')"
				@click="emit('new')"
			/>
		</div>

		<N8nLoading v-if="loading" :loading="true" :rows="3" variant="p" />

		<div v-else-if="items.length === 0" :class="$style.empty">
			<N8nText color="text-light" size="small">
				{{ i18n.baseText('promotions.sidebar.empty') }}
			</N8nText>
		</div>

		<ul v-else :class="$style.list">
			<li v-for="item in items" :key="item.id">
				<button
					type="button"
					:class="[$style.card, item.id === selectedId && $style.selected]"
					data-test-id="promotion-card"
					@click="emit('select', item.id)"
				>
					<div :class="$style.cardTop">
						<N8nText bold size="small" :class="$style.cardTitle">
							{{
								i18n.baseText('promotions.card.title', {
									interpolate: { type: item.unitOfWork.type, id: item.unitOfWork.id },
								})
							}}
						</N8nText>
						<PromotionStateBadge :state="item.state" />
					</div>
					<div :class="$style.cardBottom">
						<N8nTooltip
							:content="
								i18n.baseText(
									item.role === 'source'
										? 'promotions.role.source.tooltip'
										: 'promotions.role.destination.tooltip',
								)
							"
							placement="top"
						>
							<span :class="$style.role">
								<N8nIcon :icon="item.role === 'source' ? 'send' : 'package-open'" size="xsmall" />
								{{
									i18n.baseText(
										item.role === 'source'
											? 'promotions.role.source'
											: 'promotions.role.destination',
									)
								}}
							</span>
						</N8nTooltip>
						<N8nText color="text-light" size="xsmall">{{ item.model }}</N8nText>
						<N8nText
							v-if="item.metadata.prNumber"
							color="text-light"
							size="xsmall"
							:class="$style.pr"
						>
							#{{ item.metadata.prNumber }}
						</N8nText>
						<N8nText color="text-light" size="xsmall" :class="$style.time">
							<TimeAgo :date="item.updatedAt" />
						</N8nText>
					</div>
				</button>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.sidebar {
	display: flex;
	flex-direction: column;
	width: 340px;
	flex-shrink: 0;
	min-height: 0;
	border-right: var(--border);
	padding-right: var(--spacing--sm);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	min-height: var(--spacing--2xl);
	padding-bottom: var(--spacing--sm);
}

.empty {
	padding: var(--spacing--sm) 0;
}

.list {
	list-style: none;
	margin: 0;
	padding: 0;
	overflow-y: auto;
	min-height: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	width: 100%;
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
	cursor: pointer;
	text-align: left;

	&:hover {
		border-color: var(--color--foreground--shade-1);
	}
}

.selected {
	border-color: var(--color--primary);
	background-color: var(--color--primary--tint-3);
}

.cardTop {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.cardTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.cardBottom {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.role {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}

.time {
	margin-left: auto;
	white-space: nowrap;
}

.pr {
	white-space: nowrap;
}
</style>
