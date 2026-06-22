<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import AgentSectionEditor from './AgentSectionEditor.vue';
import type { AgentJsonConfig } from '../types';

const props = withDefaults(defineProps<{ config: AgentJsonConfig | null; disabled?: boolean }>(), {
	disabled: false,
});

const emit = defineEmits<{ 'update:config': [config: AgentJsonConfig] }>();

const i18n = useI18n();
</script>

<template>
	<div
		:class="[$style.container, props.disabled && $style.disabled]"
		data-testid="agent-goals-panel"
	>
		<div :class="$style.titleGroup">
			<N8nText :bold="true">
				{{ i18n.baseText('agents.builder.goals.label') }}
			</N8nText>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.builder.goals.hint') }}
			</N8nText>
		</div>
		<div :class="$style.editor">
			<AgentSectionEditor
				:config="props.config"
				:pick-keys="['slots', 'goals']"
				:read-only="props.disabled"
				@update:config="emit('update:config', $event)"
			/>
		</div>
	</div>
</template>

<style module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.titleGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.editor {
	display: flex;
	min-height: 0;
	height: 360px;
}

/* AgentSectionEditor's root sizes its height (100%) but not its width — as a
   flex item it would shrink to content width, so stretch it explicitly. */
.editor > * {
	flex: 1;
	min-width: 0;
}

.container.disabled {
	opacity: 0.6;
}
</style>
