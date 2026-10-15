<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import type {
	WhatsAppAccountStatus,
	WhatsAppReviewStatus,
	WhatsAppSendingStatus,
} from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { isAccountStatusSettled } from './useWhatsAppAccountStatus';

const props = defineProps<{
	/** `null` while the first answer from Meta is on its way. */
	status: WhatsAppAccountStatus | null;
}>();

const i18n = useI18n();

const SENDING_KEYS: Record<Exclude<WhatsAppSendingStatus, 'unknown'>, BaseTextKey> = {
	available: 'agents.channels.whatsapp.status.sending.available',
	limited: 'agents.channels.whatsapp.status.sending.limited',
	blocked: 'agents.channels.whatsapp.status.sending.blocked',
};

const REVIEW_LABEL_KEYS = {
	displayName: 'agents.channels.whatsapp.status.review.displayName',
	businessVerification: 'agents.channels.whatsapp.status.review.businessVerification',
	accountReview: 'agents.channels.whatsapp.status.review.accountReview',
} as const satisfies Record<string, BaseTextKey>;

const REVIEW_STATE_KEYS: Record<Exclude<WhatsAppReviewStatus, 'unknown'>, BaseTextKey> = {
	approved: 'agents.channels.whatsapp.status.state.approved',
	pending: 'agents.channels.whatsapp.status.state.pending',
	rejected: 'agents.channels.whatsapp.status.state.rejected',
	notStarted: 'agents.channels.whatsapp.status.state.notStarted',
};

const REVIEW_ICONS: Record<Exclude<WhatsAppReviewStatus, 'unknown'>, IconName> = {
	approved: 'check',
	pending: 'loader-circle',
	rejected: 'circle-x',
	notStarted: 'circle',
};

const sending = computed(() => {
	const value = props.status?.sending;
	if (!value || value === 'unknown') return null;
	return { value, text: i18n.baseText(SENDING_KEYS[value]) };
});

// A review Meta did not report is left out instead of shown as unknown.
const reviews = computed(() => {
	const status = props.status;
	if (!status) return [];
	return (Object.keys(REVIEW_LABEL_KEYS) as Array<keyof typeof REVIEW_LABEL_KEYS>).flatMap(
		(review) => {
			const state = status[review];
			if (state === 'unknown') return [];
			return [
				{
					review,
					state,
					label: i18n.baseText(REVIEW_LABEL_KEYS[review]),
					text: i18n.baseText(REVIEW_STATE_KEYS[state]),
					icon: REVIEW_ICONS[state],
				},
			];
		},
	);
});

const waiting = computed(() => props.status !== null && !isAccountStatusSettled(props.status));
</script>

<template>
	<div :class="$style.status" data-testid="whatsapp-account-status">
		<N8nText size="small" bold>
			{{ i18n.baseText('agents.channels.whatsapp.status.title') }}
		</N8nText>

		<N8nText
			v-if="!status"
			size="small"
			:class="[$style.hint, $style.line]"
			data-testid="whatsapp-account-status-loading"
		>
			<N8nIcon icon="loader-circle" size="small" spin />
			{{ i18n.baseText('agents.channels.whatsapp.status.loading') }}
		</N8nText>

		<template v-else>
			<N8nText
				v-if="sending"
				size="small"
				:class="[$style.line, $style[sending.value]]"
				:data-testid="`whatsapp-account-status-sending-${sending.value}`"
			>
				<N8nIcon :icon="sending.value === 'blocked' ? 'circle-x' : 'check'" size="small" />
				{{ sending.text }}
			</N8nText>

			<ul v-if="status.reasons.length" :class="$style.reasons">
				<li
					v-for="reason in status.reasons"
					:key="reason.description"
					data-testid="whatsapp-account-status-reason"
				>
					<N8nText size="small">{{ reason.description }}</N8nText>
					<N8nText v-if="reason.solution" size="small" :class="$style.hint">
						{{ reason.solution }}
					</N8nText>
				</li>
			</ul>

			<div
				v-for="review in reviews"
				:key="review.review"
				:class="$style.review"
				:data-testid="`whatsapp-account-status-${review.review}`"
			>
				<N8nText size="small" :class="$style.hint">{{ review.label }}</N8nText>
				<N8nText size="small" :class="[$style.line, $style[review.state]]">
					<N8nIcon :icon="review.icon" size="small" :spin="review.state === 'pending'" />
					{{ review.text }}
				</N8nText>
			</div>

			<N8nText
				v-if="status.sandbox"
				size="small"
				:class="$style.hint"
				data-testid="whatsapp-account-status-sandbox"
			>
				{{ i18n.baseText('agents.channels.whatsapp.status.sandbox') }}
			</N8nText>
			<N8nText
				v-if="waiting"
				size="small"
				:class="$style.hint"
				data-testid="whatsapp-account-status-polling"
			>
				{{ i18n.baseText('agents.channels.whatsapp.status.polling') }}
			</N8nText>
		</template>
	</div>
</template>

<style module lang="scss">
.status {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	width: 100%;
}

.line {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.review {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.reasons {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin: 0;
	padding-left: var(--spacing--sm);
}

.reasons li {
	display: flex;
	flex-direction: column;
}

.hint {
	color: var(--text-color--subtler);
}

.available,
.approved {
	color: var(--text-color--success);
}

.limited,
.pending {
	color: var(--text-color--warning);
}

.blocked,
.rejected {
	color: var(--text-color--danger);
}

.notStarted {
	color: var(--text-color--subtler);
}
</style>
