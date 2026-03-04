<script lang="ts" setup>
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import Modal from '@/app/components/Modal.vue';
import { VIEWS } from '@/app/constants';
import { N8nIcon, N8nText } from '@n8n/design-system';

interface WorkflowDependent {
	id: string;
	name: string;
	projectId?: string;
}

defineProps<{
	modalName: string;
	data: {
		resourceName: string;
		dependents: WorkflowDependent[];
	};
}>();

const router = useRouter();
const i18n = useI18n();
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
				<ul :class="$style.depList">
					<li
						v-for="dep in data.dependents"
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
