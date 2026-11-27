<script setup lang="ts">
import { N8nButton, N8nEmptyState, N8nNodeIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useTypeIcons } from '../composables/useTypeIcons';
import { RULE_TEMPLATES } from '../runtime-credentials.presets';
import type { RuleTemplateId } from '../runtime-credentials.presets';

const emit = defineEmits<{
	template: [id: RuleTemplateId];
	scratch: [];
}>();

const i18n = useI18n();
const { credentialIcon } = useTypeIcons();
</script>

<template>
	<N8nEmptyState
		:icon="{
			type: 'cards',
			center: 'key-round',
			sides: ['arrow-down-to-line', 'blocks'],
			animated: false,
		}"
		:heading="i18n.baseText('runtimeCredentials.rules.empty.title')"
		:description="i18n.baseText('runtimeCredentials.rules.empty.description')"
		data-test-id="runtime-rules-empty"
	>
		<template #additionalContent>
			<div :class="$style.content">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('runtimeCredentials.rules.empty.templates') }}
				</N8nText>
				<div :class="$style.templates">
					<N8nButton
						v-for="template in RULE_TEMPLATES"
						:key="template.id"
						variant="outline"
						size="large"
						:class="$style.template"
						:data-test-id="`runtime-template-${template.id}`"
						@click="emit('template', template.id)"
					>
						<template #icon>
							<N8nNodeIcon v-bind="credentialIcon(template.credentialType)" :size="20" />
						</template>
						<span :class="$style.templateText">
							<span>{{ i18n.baseText(template.titleKey) }}</span>
							<N8nText size="xsmall" color="text-light">
								{{ i18n.baseText(template.hintKey) }}
							</N8nText>
						</span>
					</N8nButton>
				</div>
				<N8nButton
					variant="ghost"
					size="small"
					:label="i18n.baseText('runtimeCredentials.rules.empty.scratch')"
					data-test-id="runtime-rules-empty-scratch"
					@click="emit('scratch')"
				/>
			</div>
		</template>
	</N8nEmptyState>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--2xs);
}

.templates {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: var(--spacing--2xs);
}

.template {
	/* The button grows with its two lines of text. */
	height: auto;
	padding-block: var(--spacing--2xs);
}

.templateText {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	text-align: start;
}
</style>
