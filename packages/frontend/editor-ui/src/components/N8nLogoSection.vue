<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue';
import { useFavicon } from '@vueuse/core';
import LogoIcon from './Logo/logo-icon.svg';
import LogoText from './Logo/logo-text.svg';
import {
	N8nNavigationDropdown,
	N8nIconButton,
	N8nTooltip,
	N8nButton,
	N8nIcon,
} from '@n8n/design-system';

const props = defineProps<{
	collapsed?: boolean;
	menu: any[];
	createWorkflowsAppendSlotName: string;
	createCredentialsAppendSlotName: string;
	createProjectAppendSlotName: string;
	projectsLimitReachedMessage: string;
	upgradeLabel: string;
	hasPermissionToCreateProjects: boolean;
	sourceControlBranchReadOnly: boolean;
	i18n: any;
	releaseChannel: string;
}>();

const emit = defineEmits<{
	(event: 'select', value: string): void;
}>();

const showLogoText = computed(() => !props.collapsed);
const showLogoSection = computed(() => !props.collapsed);

const handleMenuSelect = (value: string) => {
	emit('select', value);
};

const svg = useTemplateRef<{ $el: Element }>('logo');
onMounted(() => {
	if (props.releaseChannel === 'stable' || !('createObjectURL' in URL)) return;

	const logoEl = svg.value!.$el;

	// Change the logo fill color inline, so that favicon can also use it
	const logoColor = props.releaseChannel === 'dev' ? '#838383' : '#E9984B';
	logoEl.querySelector('path')?.setAttribute('fill', logoColor);

	// Reuse the SVG as favicon
	const blob = new Blob([logoEl.outerHTML], { type: 'image/svg+xml' });
	useFavicon(URL.createObjectURL(blob));
});
</script>

<template>
	<div :class="[$style.container, { [$style.collapsed]: props.collapsed }]">
		<div v-if="showLogoSection" :class="$style.logoSection">
			<LogoIcon ref="logo" :class="$style.logo" />
			<LogoText v-if="showLogoText" :class="$style.logoText" />
		</div>
		<N8nNavigationDropdown data-test-id="universal-add" :menu="menu" @select="handleMenuSelect">
			<N8nIconButton icon="plus" type="secondary" outline />
			<template #[createWorkflowsAppendSlotName]>
				<N8nTooltip
					v-if="sourceControlBranchReadOnly"
					placement="right"
					:content="i18n.baseText('readOnlyEnv.cantAdd.workflow')"
				>
					<N8nIcon style="margin-left: auto; margin-right: 5px" icon="lock" size="xsmall" />
				</N8nTooltip>
			</template>
			<template #[createCredentialsAppendSlotName]>
				<N8nTooltip
					v-if="sourceControlBranchReadOnly"
					placement="right"
					:content="i18n.baseText('readOnlyEnv.cantAdd.credential')"
				>
					<N8nIcon style="margin-left: auto; margin-right: 5px" icon="lock" size="xsmall" />
				</N8nTooltip>
			</template>
			<template #[createProjectAppendSlotName]="{ item }">
				<N8nTooltip
					v-if="sourceControlBranchReadOnly"
					placement="right"
					:content="i18n.baseText('readOnlyEnv.cantAdd.project')"
				>
					<N8nIcon style="margin-left: auto; margin-right: 5px" icon="lock" size="xsmall" />
				</N8nTooltip>
				<N8nTooltip
					v-else-if="item.disabled"
					placement="right"
					:content="projectsLimitReachedMessage"
				>
					<N8nIcon
						v-if="!hasPermissionToCreateProjects"
						style="margin-left: auto; margin-right: 5px"
						icon="lock"
						size="xsmall"
					/>
					<N8nButton
						v-else
						:size="'mini'"
						style="margin-left: auto"
						type="tertiary"
						@click="handleMenuSelect(item.id)"
					>
						{{ upgradeLabel }}
					</N8nButton>
				</N8nTooltip>
			</template>
		</N8nNavigationDropdown>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	padding: var(--spacing-xs);
	gap: var(--spacing-s);

	&.collapsed {
		padding: var(--spacing-2xs);
	}
}

.logoSection {
	display: flex;
	align-items: center;
}

.logo {
	transform: scale(1.3) translateY(-2px);
}

.logoText {
	transform: scale(1.3) translateY(-2px);
	margin-left: var(--spacing-xs);
	margin-right: var(--spacing-3xs);
	path {
		fill: var(--color-text-dark);
	}
}
</style>
