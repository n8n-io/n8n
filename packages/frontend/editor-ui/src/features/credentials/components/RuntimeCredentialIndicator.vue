<script setup lang="ts">
import { N8nBadge, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { RouterLink } from 'vue-router';

import { useRuntimeRuleLink } from '../composables/useRuntimeRuleLink';

const props = withDefaults(
	defineProps<{
		/** The alias of the rule behind the stub. `null` or missing when the rule is gone. */
		ruleAlias?: string | null;
		/** `badge` is the outlined label of a list card. `icon` is the compact mark of a dropdown row. */
		variant?: 'badge' | 'icon';
	}>(),
	{ ruleAlias: undefined, variant: 'badge' },
);

const i18n = useI18n();
const { canManageRules, ruleLocation } = useRuntimeRuleLink();
</script>

<template>
	<N8nTooltip placement="top">
		<template #content>
			<div :class="$style.content">
				<span>{{ i18n.baseText('credentials.runtime.tooltip') }}</span>
				<!-- The tooltip is dark in both themes, so the link takes the tooltip's text color. -->
				<RouterLink
					v-if="canManageRules"
					:to="ruleLocation(props.ruleAlias)"
					:class="$style.link"
					data-test-id="credential-runtime-manage-rule"
				>
					{{ i18n.baseText('credentials.runtime.manageRule') }}
				</RouterLink>
			</div>
		</template>
		<N8nBadge
			v-if="variant === 'badge'"
			variant="outline"
			leading-icon="arrow-down-to-line"
			data-test-id="credential-runtime-badge"
		>
			{{ i18n.baseText('credentials.runtime.label') }}
		</N8nBadge>
		<N8nIcon
			v-else
			icon="arrow-down-to-line"
			size="small"
			:aria-label="i18n.baseText('credentials.runtime.label')"
			data-test-id="credential-runtime-badge"
		/>
	</N8nTooltip>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--3xs);
}

.link {
	color: inherit;
	font-weight: var(--font-weight--bold);
	text-decoration: underline;
}
</style>
