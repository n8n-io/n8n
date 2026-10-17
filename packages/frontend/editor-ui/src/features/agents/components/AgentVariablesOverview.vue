<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentVariable } from '@n8n/api-types';

import { describeVariableDefault } from '../composables/useAgentTestVariables';
import type { ToolOpenTarget } from './AgentCapabilitiesSection.types';

defineProps<{ variables: AgentVariable[] }>();

const emit = defineEmits<{ 'open-tool': [target: ToolOpenTarget] }>();

const i18n = useI18n();

function openTool(name: string) {
	emit('open-tool', { kind: 'tool', toolType: 'node', id: name });
}
</script>

<template>
	<ul :class="$style.list" data-testid="agent-variables-list">
		<li
			v-for="variable in variables"
			:key="variable.name"
			:class="$style.row"
			data-testid="agent-variable-row"
		>
			<div :class="$style.main">
				<code :class="$style.name" data-testid="agent-variable-name">{{ variable.name }}</code>
				<N8nText v-if="variable.tools.length" size="small" color="text-light">
					{{ i18n.baseText('agents.variables.readBy') }}
					<template v-for="(tool, index) in variable.tools" :key="tool">
						<button
							type="button"
							:class="$style.toolLink"
							:aria-label="i18n.baseText('agents.variables.openTool', { interpolate: { tool } })"
							data-testid="agent-variable-tool"
							@click="openTool(tool)"
						>
							{{ tool }}</button
						><span v-if="index < variable.tools.length - 1">, </span>
					</template>
				</N8nText>
			</div>
			<div v-if="variable.default" :class="$style.status" data-testid="agent-variable-status">
				<N8nIcon icon="check" size="small" color="success" aria-hidden="true" />
				<N8nText size="small" color="text-base">
					{{ i18n.baseText('agents.variables.status.hasDefault') }}
				</N8nText>
				<N8nText size="small" color="text-light" data-testid="agent-variable-default">
					{{
						describeVariableDefault(variable) ??
						i18n.baseText('agents.variables.default.expression')
					}}
				</N8nText>
			</div>
			<div
				v-else
				:class="[$style.status, $style.warning]"
				role="status"
				data-testid="agent-variable-status"
			>
				<N8nIcon icon="triangle-alert" size="small" color="warning" aria-hidden="true" />
				<N8nText size="small" color="warning" bold>
					{{ i18n.baseText('agents.variables.status.noDefault') }}
				</N8nText>
				<N8nText size="small" color="text-light" data-testid="agent-variable-no-default-hint">
					{{ i18n.baseText('agents.variables.noDefault.hint') }}
				</N8nText>
			</div>
		</li>
	</ul>
</template>

<style lang="scss" module>
.list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.row {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.main {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: var(--spacing--2xs);
}

.name {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--text-color);
}

.toolLink {
	border: 0;
	padding: 0;
	background: none;
	font: inherit;
	color: var(--text-color--subtle);
	text-decoration: underline;
	cursor: pointer;

	&:hover {
		color: var(--text-color);
	}
}

.status {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
