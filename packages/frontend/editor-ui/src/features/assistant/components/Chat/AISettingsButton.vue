<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nLink, N8nTooltip, N8nIcon } from '@n8n/design-system';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/constants';

type Props = {
	disabled?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
});

const i18n = useI18n();
const router = useRouter();
</script>
<template>
	<div :class="$style.container" data-test-id="ai-settings-button">
		<N8nTooltip :content="i18n.baseText('settings.ai.button.tooltip')" :disabled="props.disabled">
			<N8nLink
				:to="{ name: VIEWS.AI_SETTINGS }"
				:aria-label="i18n.baseText('settings.ai.button.tooltip')"
				:class="{ [$style.link]: true, [$style.disabled]: props.disabled }"
			>
				<N8nIcon icon="settings" size="xlarge" />
			</N8nLink>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	justify-content: center;
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
