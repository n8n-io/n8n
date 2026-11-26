<script setup lang="ts">
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, useId, useTemplateRef } from 'vue';

import { hasBlockingGroup, type EngineV2FindingGroup } from '../engineV2Findings';
import { describeCompatibilityReason } from '../engineV2ReasonText';
import { severityIcon } from './severityIcon';

const {
	groups,
	canSwitchToV1 = true,
	switching = false,
} = defineProps<{
	groups: EngineV2FindingGroup[];
	/** False when the user can't edit the workflow. */
	canSwitchToV1?: boolean;
	/** True while the switch to engine v1 saves. */
	switching?: boolean;
}>();

const emit = defineEmits<{
	'open-node': [nodeId: string];
	'switch-to-v1': [];
}>();

const open = defineModel<boolean>('open', { required: true });

const i18n = useI18n();
const idPrefix = useId();

const gotItButton = useTemplateRef('gotIt');

// People open the findings often to check them. Focus "Got it", so Enter closes the dialog.
function onOpenAutoFocus(event: Event) {
	const button: unknown = gotItButton.value?.$el;
	if (!(button instanceof HTMLElement)) return;
	event.preventDefault();
	button.focus();
}

const intro = computed(() =>
	i18n.baseText(
		hasBlockingGroup(groups)
			? 'engineV2Compatibility.dialog.intro'
			: 'engineV2Compatibility.dialog.introWarnings',
	),
);

const rows = computed(() =>
	groups.map((group) => ({
		id: group.id,
		headingId: `${idPrefix}-${group.id}`,
		nodeId: group.nodeId,
		title: group.nodeName ?? i18n.baseText('engineV2Compatibility.dialog.workflowSettings'),
		findings: group.reasons.map((reason, index) => {
			const { text, fix } = describeCompatibilityReason(reason);
			return { id: `${index}-${reason.code}`, ...severityIcon(reason.severity), text, fix };
		}),
	})),
);
</script>

<template>
	<N8nDialog
		v-model:open="open"
		size="medium"
		:header="i18n.baseText('engineV2Compatibility.dialog.title')"
		data-test-id="engine-v2-compatibility-dialog"
		@open-auto-focus="onOpenAutoFocus"
	>
		<N8nDialogBody>
			<N8nText
				tag="p"
				size="small"
				:class="$style.intro"
				data-test-id="engine-v2-compatibility-intro"
			>
				{{ intro }}
			</N8nText>
			<ul :class="$style.groups">
				<li
					v-for="row in rows"
					:key="row.id"
					:class="$style.group"
					:aria-labelledby="row.headingId"
					data-test-id="engine-v2-compatibility-group"
				>
					<div :class="$style.groupHeader">
						<N8nText
							:id="row.headingId"
							tag="h3"
							size="small"
							bold
							:class="$style.groupTitle"
							data-test-id="engine-v2-compatibility-group-title"
						>
							{{ row.title }}
						</N8nText>
						<N8nButton
							v-if="row.nodeId"
							variant="ghost"
							size="small"
							:aria-describedby="row.headingId"
							data-test-id="engine-v2-compatibility-go-to-node"
							data-attr="engine-v2-compatibility-go-to-node"
							@click="emit('open-node', row.nodeId)"
						>
							{{ i18n.baseText('engineV2Compatibility.dialog.goToNode') }}
						</N8nButton>
					</div>
					<ul :class="$style.findings">
						<li
							v-for="finding in row.findings"
							:key="finding.id"
							:class="$style.finding"
							data-test-id="engine-v2-compatibility-reason"
						>
							<N8nIcon
								:icon="finding.icon"
								:color="finding.color"
								:class="$style.icon"
								aria-hidden="true"
							/>
							<div>
								<N8nText tag="p" size="small" :class="$style.text">{{ finding.text }}</N8nText>
								<N8nText
									v-if="finding.fix"
									tag="p"
									size="small"
									color="text-base"
									:class="$style.text"
									data-test-id="engine-v2-compatibility-fix"
								>
									{{ finding.fix }}
								</N8nText>
							</div>
						</li>
					</ul>
				</li>
			</ul>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:disabled="!canSwitchToV1"
				:loading="switching"
				data-test-id="engine-v2-compatibility-switch-to-v1"
				data-attr="engine-v2-compatibility-switch-to-v1"
				@click="emit('switch-to-v1')"
			>
				{{ i18n.baseText('engineV2Compatibility.dialog.switchToV1') }}
			</N8nButton>
			<N8nButton
				ref="gotIt"
				data-test-id="engine-v2-compatibility-got-it"
				data-attr="engine-v2-compatibility-got-it"
				@click="open = false"
			>
				{{ i18n.baseText('engineV2Compatibility.dialog.gotIt') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.intro {
	display: block;
	margin: 0 0 var(--spacing--md);
}

.groups,
.findings {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	list-style: none;
}

.groups {
	gap: var(--spacing--sm);
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--sm);
	border-top: var(--border);

	&:first-child {
		padding-top: 0;
		border-top: none;
	}
}

.groupHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	min-height: var(--height--sm);
}

.groupTitle {
	margin: 0;
	min-width: 0;
	overflow-wrap: anywhere;
}

.findings {
	gap: var(--spacing--xs);
}

.finding {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
}

.text {
	margin: 0;
	line-height: var(--line-height--lg);
}

.icon {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
}
</style>
