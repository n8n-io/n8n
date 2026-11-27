<script setup lang="ts">
import { N8nButton, N8nCallout, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { BranchCredential } from '../../composables/usePreparedApplyCredentials';

// Prototype: the credentials that Apply creates from the branch, and the values they still need.
const props = defineProps<{
	credentials: BranchCredential[];
	readyIds: ReadonlySet<string>;
	busy: boolean;
}>();

const emit = defineEmits<{ addValues: [credential: BranchCredential] }>();

const i18n = useI18n();
const pendingCount = computed(
	() => props.credentials.filter(({ sourceId }) => !props.readyIds.has(sourceId)).length,
);
</script>

<template>
	<section :class="$style.section" data-test-id="promotion-prepared-credentials">
		<N8nText tag="h3" bold color="text-dark">
			{{ i18n.baseText('promotions.prototype.prepared.title') }}
		</N8nText>
		<N8nText tag="p" color="text-base">
			{{
				i18n.baseText('promotions.prototype.prepared.intro', {
					adjustToNumber: credentials.length,
					interpolate: { count: String(credentials.length) },
				})
			}}
		</N8nText>
		<N8nCallout v-if="pendingCount === 0" theme="success" slim>
			{{ i18n.baseText('promotions.prototype.prepared.allReady') }}
		</N8nCallout>
		<ul :class="$style.list">
			<li v-for="credential in credentials" :key="credential.sourceId" :class="$style.row">
				<div :class="$style.details">
					<N8nText bold>{{ credential.name }}</N8nText>
					<N8nText step="xs" color="text-light">
						{{ credential.credentialType }} · {{ credential.ownerProject.name }}
					</N8nText>
					<N8nText v-if="credential.sharedWithProjects?.length" step="xs" color="text-light">
						{{
							i18n.baseText('promotions.prototype.prepared.sharedWith', {
								interpolate: {
									projects: credential.sharedWithProjects.map(({ name }) => name).join(', '),
								},
							})
						}}
					</N8nText>
				</div>
				<div :class="$style.actions">
					<N8nText step="xs" :color="readyIds.has(credential.sourceId) ? 'success' : 'warning'">
						{{
							i18n.baseText(
								readyIds.has(credential.sourceId)
									? 'promotions.prototype.prepared.ready'
									: 'promotions.prototype.prepared.needsValues',
							)
						}}
					</N8nText>
					<N8nButton
						size="small"
						:variant="readyIds.has(credential.sourceId) ? 'outline' : 'solid'"
						:disabled="busy"
						data-test-id="promotion-prepared-add-values"
						@click="emit('addValues', credential)"
					>
						{{
							i18n.baseText(
								readyIds.has(credential.sourceId)
									? 'promotions.prototype.prepared.editValues'
									: 'promotions.prototype.prepared.addValues',
							)
						}}
					</N8nButton>
				</div>
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

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}
</style>
