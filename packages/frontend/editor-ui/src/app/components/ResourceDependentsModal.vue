<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import Modal from '@/app/components/Modal.vue';
import { VIEWS } from '@/app/constants';
import { N8nIcon, N8nInput, N8nText } from '@n8n/design-system';

interface WorkflowDependent {
	id: string;
	name: string;
	projectId?: string;
}

const props = defineProps<{
	modalName: string;
	data: {
		resourceName: string;
		dependents: WorkflowDependent[];
	};
}>();

const router = useRouter();
const i18n = useI18n();
const searchQuery = ref('');

const MIN_ITEMS_FOR_SEARCH = 3;
const showSearch = computed(() => props.data.dependents.length >= MIN_ITEMS_FOR_SEARCH);

const filteredDependents = computed(() => {
	const query = searchQuery.value.toLowerCase().trim();
	if (!query) return props.data.dependents;
	return props.data.dependents.filter((dep) => dep.name.toLowerCase().includes(query));
});

function onClickWorkflow(dep: WorkflowDependent) {
	const href = router.resolve({ name: VIEWS.WORKFLOW, params: { name: dep.id } }).href;
	window.open(href, '_blank');
}
</script>

<template>
	<Modal
		:name="modalName"
		width="500px"
		:title="i18n.baseText('resourceDependents.modal.title' as BaseTextKey)"
	>
		<template #content>
			<div :class="$style.content">
				<N8nInput
					v-if="showSearch"
					v-model="searchQuery"
					:placeholder="i18n.baseText('resourceDependents.modal.search' as BaseTextKey)"
					clearable
					data-test-id="resource-dependents-search"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>
				<ul :class="$style.depList">
					<li
						v-for="dep in filteredDependents"
						:key="dep.id"
						:class="[$style.depRow, $style.depRowClickable]"
						data-test-id="resource-dependent-item"
						@click="onClickWorkflow(dep)"
					>
						<N8nText size="small" :class="$style.depName">
							{{ dep.name }}
						</N8nText>
						<N8nIcon icon="external-link" size="small" :class="$style.depLinkIcon" />
					</li>
				</ul>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.depList {
	list-style: none;
	padding: 0;
	margin: 0;
}

.depRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius);
}

.depRowClickable {
	cursor: pointer;

	&:hover {
		background-color: var(--color--background--light-2);
	}

	&:hover .depLinkIcon {
		opacity: 1;
	}
}

.depName {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.depLinkIcon {
	flex-shrink: 0;
	opacity: 0;
	color: var(--color--text--tint-2);
	transition: opacity 0.15s ease;
}
</style>
