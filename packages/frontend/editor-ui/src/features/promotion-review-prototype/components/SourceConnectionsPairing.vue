<script lang="ts" setup>
import { useToast } from '@/app/composables/useToast';
import { usePromotionReviewStore } from '../promotionReview.store';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';
import { computed, onMounted, reactive } from 'vue';
import { N8nButton, N8nHeading, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';

const i18n = useI18n();
const toast = useToast();
const store = usePromotionReviewStore();
const { sourceConnections, isSavingConnection } = storeToRefs(store);

const form = reactive({ name: '', baseUrl: '', apiKey: '' });

const canSubmit = computed(
	() => form.name.trim() && form.baseUrl.trim() && form.apiKey.trim() && !isSavingConnection.value,
);

onMounted(async () => {
	await store.loadSourceConnections();
});

async function onAdd() {
	if (!canSubmit.value) return;
	try {
		await store.addSourceConnection({
			name: form.name.trim(),
			baseUrl: form.baseUrl.trim(),
			apiKey: form.apiKey.trim(),
		});
		form.name = '';
		form.baseUrl = '';
		form.apiKey = '';
		toast.showMessage({
			title: i18n.baseText('promotionReview.sources.toast.added.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('promotionReview.sources.toast.added.error'));
	}
}

async function onRemove(id: string) {
	try {
		await store.removeSourceConnection(id);
		toast.showMessage({
			title: i18n.baseText('promotionReview.sources.toast.removed.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('promotionReview.sources.toast.removed.error'));
	}
}
</script>

<template>
	<section :class="$style.pairing" data-test-id="promotion-review-sources">
		<div :class="$style.header">
			<N8nHeading tag="h2" size="small">
				{{ i18n.baseText('promotionReview.sources.title') }}
			</N8nHeading>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('promotionReview.sources.description') }}
			</N8nText>
		</div>

		<ul v-if="sourceConnections.length" :class="$style.list">
			<li
				v-for="connection in sourceConnections"
				:key="connection.id"
				:class="$style.item"
				data-test-id="promotion-review-source-item"
			>
				<div :class="$style.itemInfo">
					<div :class="$style.itemHeader">
						<N8nIcon icon="server" size="small" />
						<N8nText bold>{{ connection.name }}</N8nText>
					</div>
					<N8nText size="small" color="text-light">{{ connection.baseUrl }}</N8nText>
				</div>
				<N8nButton
					type="tertiary"
					size="small"
					icon="trash-2"
					:label="i18n.baseText('promotionReview.sources.remove')"
					@click="onRemove(connection.id)"
				/>
			</li>
		</ul>

		<N8nText v-else size="small" color="text-light">
			{{ i18n.baseText('promotionReview.sources.empty') }}
		</N8nText>

		<form :class="$style.form" @submit.prevent="onAdd">
			<div :class="$style.field">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('promotionReview.sources.name') }}
				</N8nText>
				<N8nInput
					v-model="form.name"
					size="small"
					:placeholder="i18n.baseText('promotionReview.sources.namePlaceholder')"
					data-test-id="promotion-review-source-name"
				/>
			</div>
			<div :class="$style.field">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('promotionReview.sources.baseUrl') }}
				</N8nText>
				<N8nInput
					v-model="form.baseUrl"
					size="small"
					:placeholder="i18n.baseText('promotionReview.sources.baseUrlPlaceholder')"
					data-test-id="promotion-review-source-base-url"
				/>
			</div>
			<div :class="$style.field">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('promotionReview.sources.apiKey') }}
				</N8nText>
				<N8nInput
					v-model="form.apiKey"
					type="password"
					size="small"
					:placeholder="i18n.baseText('promotionReview.sources.apiKeyPlaceholder')"
					data-test-id="promotion-review-source-api-key"
				/>
			</div>
			<N8nButton
				type="primary"
				size="small"
				native-type="submit"
				:disabled="!canSubmit"
				:loading="isSavingConnection"
				:label="i18n.baseText('promotionReview.sources.add')"
				data-test-id="promotion-review-source-add"
			/>
		</form>
	</section>
</template>

<style lang="scss" module>
.pairing {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--color--foreground);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
}

.itemInfo {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.itemHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
	border-top: var(--border);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
