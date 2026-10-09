<script setup lang="ts">
import { N8nNotice, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';

import type {
	TransferDialogState,
	TransferSetUpItem,
	TransferWarning,
} from './transferDialogState';

/** The sections of the move dialog: what moves, what needs setting up and what blocks the move. */
const props = defineProps<{
	state: TransferDialogState;
	/** The name of the link. */
	place: string;
}>();

const SET_UP_STATUS_TEXT: Record<TransferSetUpItem['status'], BaseTextKey> = {
	'needs-set-up': 'linkedInstances.transfer.setUp.empty',
	unknown: 'linkedInstances.transfer.setUp.unknown',
};

const WARNING_TEXT: Record<TransferWarning, BaseTextKey> = {
	nodeTypesUnchecked: 'linkedInstances.transfer.warning.nodeTypesUnchecked',
	credentialsUnchecked: 'linkedInstances.transfer.warning.credentialsUnchecked',
};

const i18n = useI18n();
const interpolate = computed(() => ({ place: props.place }));

const nodes = computed(() =>
	i18n.baseText('linkedInstances.transfer.moves.nodes', {
		adjustToNumber: props.state.nodeCount,
		interpolate: { count: String(props.state.nodeCount) },
	}),
);

const project = computed(() => {
	const name = props.state.targetProjectName;
	return name === null
		? i18n.baseText('linkedInstances.transfer.moves.personalProject')
		: i18n.baseText('linkedInstances.transfer.moves.project', { interpolate: { project: name } });
});

const matchedCredentials = computed(() => {
	const names = props.state.matchedCredentials;
	if (names.length === 0) return undefined;
	const list = new Intl.ListFormat(i18n.locale, { style: 'long', type: 'conjunction' });
	return i18n.baseText('linkedInstances.transfer.moves.matchedCredentials', {
		interpolate: { place: props.place, names: list.format(names) },
	});
});

const cannotMove = computed(
	() => props.state.missingNodeTypes.length > 0 || props.state.subWorkflowCalls.length > 0,
);

function subWorkflowLabel({ id, name }: { id: string; name: string | null }): string {
	return (
		name ??
		i18n.baseText('linkedInstances.transfer.cannotMove.hiddenWorkflow', { interpolate: { id } })
	);
}
</script>

<template>
	<div :class="$style.summary">
		<section :class="$style.section">
			<N8nText tag="h3" size="small" bold>
				{{ i18n.baseText('linkedInstances.transfer.moves.heading') }}
			</N8nText>
			<ul :class="$style.facts" data-test-id="transfer-moves">
				<li>
					<N8nText size="small">{{ nodes }}</N8nText>
				</li>
				<li>
					<N8nText size="small">{{ project }}</N8nText>
				</li>
				<li v-if="matchedCredentials">
					<N8nText size="small">{{ matchedCredentials }}</N8nText>
				</li>
			</ul>
		</section>

		<section v-if="state.needsSetUp.length > 0" :class="$style.section">
			<N8nText tag="h3" size="small" bold>
				{{ i18n.baseText('linkedInstances.transfer.setUp.heading') }}
			</N8nText>
			<ul :class="$style.facts" data-test-id="transfer-needs-set-up">
				<li v-for="(credential, index) in state.needsSetUp" :key="index" :class="$style.row">
					<N8nText size="small">{{ credential.name }}</N8nText>
					<N8nText size="small" color="text-base">
						<!-- The row shows two columns. A screen reader reads one line, so it gets a separator. -->
						<span :class="$style.visuallyHidden">: </span>
						{{ i18n.baseText(SET_UP_STATUS_TEXT[credential.status]) }}
					</N8nText>
				</li>
			</ul>
		</section>

		<section v-if="cannotMove" :class="$style.section" data-test-id="transfer-cannot-move">
			<N8nText tag="h3" size="small" bold>
				{{ i18n.baseText('linkedInstances.transfer.cannotMove.heading') }}
			</N8nText>
			<template v-if="state.subWorkflowCalls.length > 0">
				<N8nNotice theme="warning" :class="$style.notice">
					{{ i18n.baseText('linkedInstances.transfer.cannotMove.subWorkflows') }}
				</N8nNotice>
				<ul :class="$style.list">
					<li v-for="call in state.subWorkflowCalls" :key="call.id">
						<N8nText size="small">{{ subWorkflowLabel(call) }}</N8nText>
					</li>
				</ul>
			</template>
			<template v-if="state.missingNodeTypes.length > 0">
				<N8nNotice theme="warning" :class="$style.notice">
					{{ i18n.baseText('linkedInstances.transfer.cannotMove.nodeTypes', { interpolate }) }}
				</N8nNotice>
				<ul :class="$style.list">
					<li v-for="nodeType in state.missingNodeTypes" :key="nodeType">
						<code :class="$style.code">{{ nodeType }}</code>
					</li>
				</ul>
			</template>
		</section>

		<ul
			v-if="state.warnings.length > 0"
			:class="[$style.facts, $style.warnings]"
			data-test-id="transfer-warnings"
		>
			<li v-for="warning in state.warnings" :key="warning">
				<N8nText size="small" color="text-base">
					{{ i18n.baseText(WARNING_TEXT[warning], { interpolate }) }}
				</N8nText>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.summary {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.facts {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.row {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.notice {
	--notice--margin: 0;
}

.list {
	margin: 0;
	padding-left: var(--spacing--md);
	list-style: disc;
}

.code {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
}

.warnings {
	padding-top: var(--spacing--3xs);
	border-top: var(--border);
}

.visuallyHidden {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}
</style>
