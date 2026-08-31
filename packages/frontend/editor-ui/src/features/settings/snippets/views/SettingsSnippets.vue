<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { VIEWS } from '@/app/constants';
import { N8nButton, N8nEmptyState, N8nHeading, N8nIconButton, N8nText } from '@n8n/design-system';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

import { useSnippetsStore } from '../snippets.store';
import type { SnippetResource } from '../snippets.types';

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const documentTitle = useDocumentTitle();
const snippetsStore = useSnippetsStore();

const snippets = computed(() => snippetsStore.allSnippets);

const usageSyntax = (snippet: SnippetResource) =>
	`${snippet.project ? '$project' : '$snippets'}.${snippet.name}`;

async function openCreate() {
	await router.push({ name: VIEWS.SNIPPETS_NEW });
}

async function openEdit(snippet: SnippetResource) {
	await router.push({ name: VIEWS.SNIPPETS_EDIT, params: { snippetId: snippet.id } });
}

async function remove(snippet: SnippetResource) {
	try {
		await snippetsStore.deleteSnippet(snippet.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('snippets.delete.error'));
	}
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('snippets.heading'));
	await snippetsStore.fetchAll();
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<N8nHeading size="2xlarge">{{ i18n.baseText('snippets.heading') }}</N8nHeading>
			<N8nButton size="large" data-test-id="snippets-create-button" @click="openCreate">
				{{ i18n.baseText('snippets.add') }}
			</N8nButton>
		</div>
		<N8nText color="text-base">{{ i18n.baseText('snippets.description') }}</N8nText>

		<N8nEmptyState
			v-if="snippets.length === 0"
			:class="$style.empty"
			:heading="i18n.baseText('snippets.empty.heading')"
			:description="i18n.baseText('snippets.empty.description')"
			:button-text="i18n.baseText('snippets.add')"
			@click:button="openCreate"
		/>

		<table v-else :class="$style.table" data-test-id="snippets-table">
			<thead>
				<tr>
					<th>{{ i18n.baseText('snippets.table.name') }}</th>
					<th>{{ i18n.baseText('snippets.table.scope') }}</th>
					<th>{{ i18n.baseText('snippets.table.usage') }}</th>
					<th>{{ i18n.baseText('snippets.table.tests') }}</th>
					<th>{{ i18n.baseText('snippets.table.description') }}</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				<tr
					v-for="snippet in snippets"
					:key="snippet.id"
					:class="$style.row"
					:data-test-id="`snippet-row-${snippet.name}`"
					@click="openEdit(snippet)"
				>
					<td>
						<N8nText bold>{{ snippet.name }}</N8nText>
					</td>
					<td>
						<N8nText>{{ snippet.project?.name ?? i18n.baseText('snippets.scope.global') }}</N8nText>
					</td>
					<td>
						<code>{{ usageSyntax(snippet) }}</code>
					</td>
					<td>
						<N8nText color="text-light">{{ snippet.tests?.length ?? 0 }}</N8nText>
					</td>
					<td>
						<N8nText color="text-light">{{ snippet.description }}</N8nText>
					</td>
					<td :class="$style.actions">
						<N8nIconButton
							icon="pen"
							variant="ghost"
							:data-test-id="`snippet-edit-${snippet.name}`"
							@click.stop="openEdit(snippet)"
						/>
						<N8nIconButton
							icon="trash-2"
							variant="ghost"
							:data-test-id="`snippet-delete-${snippet.name}`"
							@click.stop="remove(snippet)"
						/>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	max-width: 1200px;
	// Top-level route: the page owns its spacing (no settings-layout padding)
	padding: var(--spacing--2xl);

	> * {
		margin-bottom: var(--spacing--2xs);
	}
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.empty {
	margin-top: var(--spacing--lg);
}

.table {
	width: 100%;
	border-collapse: collapse;
	text-align: left;

	th,
	td {
		padding: var(--spacing--2xs) var(--spacing--xs);
		border-bottom: var(--border-width) solid var(--color--foreground);
	}
}

.row {
	cursor: pointer;

	&:hover {
		background-color: var(--color--background--light-2, var(--color--background));
	}
}

.actions {
	display: flex;
	gap: var(--spacing--4xs);
	justify-content: flex-end;
}
</style>
