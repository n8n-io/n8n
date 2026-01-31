<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nLink, N8nTooltip, N8nIcon, N8nInfoTip } from '@n8n/design-system';
import { VIEWS } from '@/app/constants';

type Props = {
	disabled?: boolean;
	showUsabilityNotice?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
	showUsabilityNotice: false,
});

const i18n = useI18n();
</script>
<template>
	<div :class="$style.container" data-test-id="ai-settings-button">
		<N8nInfoTip v-if="props.showUsabilityNotice" theme="warning" type="tooltip">
			<span>{{ i18n.baseText('aiAssistant.reducedHelp.chat.notice') }}</span>
		</N8nInfoTip>
		<N8nTooltip :content="i18n.baseText('settings.ai.button.tooltip')" :disabled="props.disabled">
			<N8nLink
				:to="props.disabled ? undefined : { name: VIEWS.AI_SETTINGS }"
				:aria-label="i18n.baseText('settings.ai.button.tooltip')"
				:class="{ [$style.link]: true, [$style.disabled]: props.disabled }"
			>
				<N8nIcon icon="settings" size="large" color="text-light" />
			</N8nLink>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
}

.link {
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: var(--spacing--4xs);

	svg {
		color: var(--color--text);
		transition: color 0.2s ease-in-out;
	}

	&:hover svg {
		color: var(--color--text--shade-1);
	}

	:global(.n8n-text) {
		display: flex;
	}

	&.disabled {
		pointer-events: none;
		svg {
			color: var(--color--text--tint-2);
		}
	}
}
</style>
