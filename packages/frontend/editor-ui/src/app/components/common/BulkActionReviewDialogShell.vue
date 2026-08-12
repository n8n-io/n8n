<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nCollapsiblePanel,
	N8nText,
} from '@n8n/design-system';

export type BulkActionReviewItem = {
	id: string;
	resourceType: string;
	name: string;
};

const props = withDefaults(
	defineProps<{
		open: boolean;
		title: string;
		summary: string;
		confirmLabel: string;
		affected: BulkActionReviewItem[];
		unchanged?: BulkActionReviewItem[];
		affectedHeading: string;
		unchangedHeading?: string;
		submitting: boolean;
		confirmDisabled?: boolean;
		destructive?: boolean;
		errorMessage?: string | null;
		errorDetails?: string[];
	}>(),
	{
		unchanged: () => [],
		unchangedHeading: '',
		confirmDisabled: false,
		destructive: false,
		errorMessage: null,
		errorDetails: () => [],
	},
);

const emit = defineEmits<{
	'update:open': [value: boolean];
	confirm: [];
}>();

const i18n = useI18n();
const showAffected = ref(false);
const showUnchanged = ref(false);

watch(
	() => props.open,
	(isOpen) => {
		if (!isOpen) return;
		showAffected.value = false;
		showUnchanged.value = false;
	},
);

const close = () => {
	if (props.submitting) return;
	emit('update:open', false);
};

const confirm = () => {
	if (props.submitting || props.confirmDisabled) return;
	emit('confirm');
};
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		:show-close-button="!submitting"
		:disable-outside-pointer-events="true"
		data-test-id="bulk-action-review-dialog"
		@update:open="close"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
		</N8nDialogHeader>

		<div :class="$style.body">
			<N8nText color="text-base">{{ summary }}</N8nText>

			<slot />

			<N8nCollapsiblePanel v-if="affected.length" v-model="showAffected" :title="affectedHeading">
				<ul :class="$style.list" data-test-id="bulk-action-affected-list">
					<li v-for="item in affected" :key="`${item.resourceType}:${item.id}`">
						<N8nText size="small">{{ item.name }}</N8nText>
					</li>
				</ul>
			</N8nCollapsiblePanel>

			<N8nCollapsiblePanel
				v-if="unchanged.length"
				v-model="showUnchanged"
				:title="unchangedHeading"
			>
				<ul :class="$style.list" data-test-id="bulk-action-unchanged-list">
					<li v-for="item in unchanged" :key="`${item.resourceType}:${item.id}`">
						<N8nText size="small" color="text-light">{{ item.name }}</N8nText>
					</li>
				</ul>
			</N8nCollapsiblePanel>

			<N8nCallout v-if="errorMessage" theme="danger" :class="$style.callout">
				<N8nText>{{ errorMessage }}</N8nText>
				<ul v-if="errorDetails.length" :class="$style.errorList">
					<li v-for="detail in errorDetails" :key="detail">{{ detail }}</li>
				</ul>
			</N8nCallout>
		</div>

		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:disabled="submitting"
				data-test-id="bulk-action-cancel"
				@click="close"
			>
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton
				:variant="destructive ? 'destructive' : 'solid'"
				:loading="submitting"
				:disabled="submitting || confirmDisabled"
				data-test-id="bulk-action-confirm"
				@click="confirm"
			>
				{{ confirmLabel }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	margin-top: var(--spacing--xs);
}

.callout {
	margin: 0;
}

.list,
.errorList {
	max-height: 160px;
	overflow-y: auto;
	margin: 0;
	padding: var(--spacing--3xs) 0 0 var(--spacing--md);
	list-style: disc;

	li {
		padding: var(--spacing--5xs) 0;
	}
}
</style>
