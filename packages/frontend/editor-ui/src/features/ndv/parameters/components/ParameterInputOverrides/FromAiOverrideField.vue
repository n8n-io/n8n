<script setup lang="ts">
import { N8nIcon, N8nIconButton, N8nTag, N8nText } from '@n8n/design-system';
import { i18n } from '@n8n/i18n';
import ParameterIssues from '../ParameterIssues.vue';

defineProps<{
	isReadOnly?: boolean;
	issues?: string[];
}>();

const emit = defineEmits<{ close: [] }>();
</script>

<template>
	<div :class="$style.field" data-test-id="fromAI-override-field">
		<N8nTag
			:text="i18n.baseText('parameterOverride.overridePanelText')"
			:clickable="false"
			size="md"
			:class="$style.tag"
		>
			<template #tag>
				<N8nIcon icon="sparkles" size="small" :class="$style.icon" />
				<N8nText size="small" compact :class="$style.label">
					{{ i18n.baseText('parameterOverride.overridePanelText') }}
				</N8nText>
				<N8nIconButton
					v-if="!isReadOnly"
					icon="x"
					variant="ghost"
					size="xsmall"
					:class="$style.remove"
					:aria-label="i18n.baseText('parameterOverride.editValue')"
					@click="emit('close')"
				/>
			</template>
		</N8nTag>
		<ParameterIssues v-if="issues?.length" :class="$style.issues" :issues="issues" />
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_input.scss' as input;

.field {
	@include input.size-variables('small');
	@include input.theme-variables;
	display: flex;
	align-items: center;
	width: 100%;
	height: var(--input--height);
	box-sizing: border-box;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs);
	border-radius: var(--input--radius);
	background-color: var(--input--color--background);
	box-shadow: inset var(--input--border--shadow);
}

.tag {
	--tag--min-width: 0;
	--tag--max-width: 100%;
	gap: var(--spacing--3xs);
	height: 100%;
	min-height: 0;
	padding-block: 0;
}

.issues {
	margin-left: auto;
}

.icon {
	flex-shrink: 0;
}

.label {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.remove {
	flex-shrink: 0;
	color: var(--text-color--subtler);
}
</style>
