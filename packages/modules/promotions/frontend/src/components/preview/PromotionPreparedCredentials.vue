<script setup lang="ts">
import { N8nButton, N8nCallout, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { PreparedApplyCredential } from '../../promotions.api';

// Prototype: the credentials that the Apply created from the branch, and the values they still need.
const props = defineProps<{
	prepared: PreparedApplyCredential[];
	pending: PreparedApplyCredential[];
	busy: boolean;
	error: string | null;
}>();

const emit = defineEmits<{ addValues: [id: string] }>();

const i18n = useI18n();
const pendingIds = computed(() => new Set(props.pending.map(({ id }) => id)));
const created = computed(() => props.prepared.filter(({ created: isNew }) => isNew));
</script>

<template>
	<section :class="$style.section" data-test-id="promotion-prepared-credentials">
		<N8nText tag="h3" bold color="text-dark">
			{{ i18n.baseText('promotions.prototype.prepared.title') }}
		</N8nText>
		<N8nText tag="p" color="text-base">
			{{
				i18n.baseText('promotions.prototype.prepared.intro', {
					adjustToNumber: created.length,
					interpolate: { count: String(created.length) },
				})
			}}
		</N8nText>
		<N8nCallout v-if="error" theme="danger" slim>{{ error }}</N8nCallout>
		<N8nCallout v-else-if="pending.length === 0" theme="success" slim>
			{{ i18n.baseText('promotions.prototype.prepared.allReady') }}
		</N8nCallout>
		<ul :class="$style.list">
			<li v-for="credential in created" :key="credential.id" :class="$style.row">
				<div :class="$style.details">
					<N8nText bold>{{ credential.name }}</N8nText>
					<N8nText step="xs" color="text-light">{{ credential.type }}</N8nText>
					<N8nText v-if="credential.sharedWith.length > 0" step="xs" color="text-light">
						{{
							i18n.baseText('promotions.prototype.prepared.sharedWith', {
								interpolate: {
									projects: credential.sharedWith.map(({ name }) => name).join(', '),
								},
							})
						}}
					</N8nText>
					<N8nText v-if="credential.notShared.length > 0" step="xs" color="warning">
						{{
							i18n.baseText('promotions.prototype.prepared.notShared', {
								adjustToNumber: credential.notShared.length,
								interpolate: { count: String(credential.notShared.length) },
							})
						}}
					</N8nText>
				</div>
				<N8nButton
					v-if="pendingIds.has(credential.id)"
					size="small"
					:disabled="busy"
					data-test-id="promotion-prepared-add-values"
					@click="emit('addValues', credential.id)"
				>
					{{ i18n.baseText('promotions.prototype.prepared.addValues') }}
				</N8nButton>
				<N8nText v-else step="xs" color="success">
					{{ i18n.baseText('promotions.prototype.prepared.ready') }}
				</N8nText>
			</li>
		</ul>
	</section>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-bottom: var(--spacing--lg);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
}

.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}
</style>
