<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { N8nActionDropdown, N8nButton, N8nIcon } from '@n8n/design-system';
import type { ActionDropdownItem, IconName } from '@n8n/design-system';
import { useProtoChrome } from '../nav/useProtoChrome';

/**
 * The "Settings" button of the menu variant. It sits in the project header
 * and lists the settings pages, so settings take no room in the navigation.
 */
const { nav, page } = useProtoChrome();
const router = useRouter();

/** Each item's id is the path it opens. A rule separates the groups. */
const items = computed<Array<ActionDropdownItem<string>>>(() =>
	(nav.value?.settings ?? []).flatMap((section, sectionIndex) =>
		section.items.map((item, index) => ({
			id: item.to,
			label: item.label,
			icon: item.icon as IconName,
			divided: sectionIndex > 0 && index === 0,
			checked: item.id === page.value,
		})),
	),
);

const onSettingsPage = computed(
	() => nav.value?.settingsFlat.some((item) => item.id === page.value) ?? false,
);

function onSelect(path: string) {
	void router.push(path);
}
</script>

<template>
	<N8nActionDropdown
		v-if="items.length > 0"
		:items="items"
		placement="bottom-end"
		data-test-id="proto-settings-menu"
		@select="onSelect"
	>
		<template #activator>
			<N8nButton
				variant="outline"
				size="medium"
				icon="settings"
				:class="{ [$style.current]: onSettingsPage }"
				:aria-current="onSettingsPage ? 'page' : undefined"
				data-test-id="proto-settings-menu-button"
			>
				Settings
				<N8nIcon icon="chevron-down" size="small" :class="$style.chevron" />
			</N8nButton>
		</template>
	</N8nActionDropdown>
</template>

<style lang="scss" module>
.chevron {
	margin-inline-start: var(--spacing--4xs);
	color: var(--text-color--subtle);
}

/* While a settings page is open, the button reads as the place you are in. */
.current {
	background-color: var(--background--hover);
}
</style>
