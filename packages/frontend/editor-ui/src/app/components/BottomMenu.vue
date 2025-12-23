<script setup lang="ts">
import { computed } from 'vue';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import {
	N8nMenuItem,
	N8nPopover,
	N8nText,
	isCustomMenuItem,
	type IMenuItem,
	type IMenuElement,
} from '@n8n/design-system';
import { RELEASE_NOTES_URL } from '@/app/constants';
import BecomeTemplateCreatorCta from '@/app/components/BecomeTemplateCreatorCta/BecomeTemplateCreatorCta.vue';
import { useVersionsStore } from '@/app/stores/versions.store';
import VersionUpdateCTA from '@/app/components/VersionUpdateCTA.vue';
import { useUsersStore } from '@/features/settings/users/users.store';

import { useI18n } from '@n8n/i18n';

defineProps<{
	items: IMenuItem[];
	isCollapsed: boolean;
}>();

const emit = defineEmits<{
	select: [key: string];
	logout: [];
}>();

const cloudPlanStore = useCloudPlanStore();
const versionsStore = useVersionsStore();
const usersStore = useUsersStore();

const i18n = useI18n();

const whatsNewItems = computed<{ available: boolean; children: IMenuElement[] }>(() => ({
	available: versionsStore.hasVersionUpdates || versionsStore.whatsNewArticles.length > 0,
	children: [
		...versionsStore.whatsNewArticles.map(
			(article) =>
				({
					id: `whats-new-article-${article.id}`,
					label: article.title,
					size: 'small',
					customIconSize: 'small',
					icon: {
						type: 'emoji',
						value: '•',
						color: !versionsStore.isWhatsNewArticleRead(article.id) ? 'primary' : 'text-light',
					},
				}) satisfies IMenuItem,
		),
		{
			id: 'full-changelog',
			icon: 'external-link',
			label: i18n.baseText('mainSidebar.whatsNew.fullChangelog'),
			link: {
				href: RELEASE_NOTES_URL,
				target: '_blank',
			},
			size: 'small',
			customIconSize: 'small',
		},
		{
			id: 'version-upgrade-cta',
			component: VersionUpdateCTA,
			available: versionsStore.hasVersionUpdates && usersStore.canUserUpdateVersion,
			props: {
				tooltipText: !usersStore.canUserUpdateVersion
					? i18n.baseText('whatsNew.updateNudgeTooltip')
					: undefined,
			},
		},
	],
}));

const userIsTrialing = computed(() => cloudPlanStore.userIsTrialing);

function handleSelect(key: string) {
	emit('select', key);
}

function onLogout() {
	emit('logout');
}
</script>

<template>
	<div
		:class="{
			[$style.bottomMenu]: true,
			[$style.collapsed]: isCollapsed,
		}"
	>
		<div :class="$style.bottomMenuItems">
			<template v-for="item in items" :key="item.id">
				<!-- Help popover -->
				<N8nPopover
					v-if="item.children && item.id === 'help'"
					key="help"
					side="right"
					align="end"
					:side-offset="12"
				>
					<template #content>
						<div :class="$style.popover">
							<BecomeTemplateCreatorCta v-if="!isCollapsed && !userIsTrialing" />
							<template v-for="child in item.children" :key="child.id">
								<component
									:is="child.component"
									v-if="isCustomMenuItem(child)"
									v-bind="child.props"
								/>
								<N8nMenuItem v-else :item="child" @click="() => handleSelect(child.id)" />
							</template>
							<template v-if="whatsNewItems.available">
								<N8nText bold size="small" :class="$style.popoverTitle" color="text-light"
									>What's new</N8nText
								>
								<template v-for="child in whatsNewItems.children" :key="child.id">
									<component
										:is="child.component"
										v-if="isCustomMenuItem(child)"
										v-bind="child.props"
									/>
									<N8nMenuItem v-else :item="child" @click="() => handleSelect(child.id)" />
								</template>
							</template>
						</div>
					</template>
					<template #trigger>
						<N8nMenuItem
							:data-test-id="`main-sidebar-${item.id}`"
							:item="item"
							:compact="isCollapsed"
							@click="() => handleSelect(item.id)"
						/>
					</template>
				</N8nPopover>
				<!-- Settings popover -->
				<N8nPopover
					v-else-if="item.children && item.id === 'settings'"
					key="settings"
					side="right"
					align="end"
					:side-offset="12"
				>
					<template #content>
						<div :class="$style.popover">
							<template v-for="child in item.children" :key="child.id">
								<component
									:is="child.component"
									v-if="isCustomMenuItem(child)"
									v-bind="child.props"
								/>
								<N8nMenuItem v-else :item="child" @click="() => handleSelect(child.id)" />
							</template>
							<span :class="$style.divider" />
							<N8nMenuItem
								:data-test-id="'main-sidebar-log-out'"
								:item="{ id: 'sign-out', label: 'Sign out', icon: 'door-open' }"
								@click="onLogout"
							/>
						</div>
					</template>
					<template #trigger>
						<N8nMenuItem
							:data-test-id="`main-sidebar-${item.id}`"
							:item="item"
							:compact="isCollapsed"
							@click="() => handleSelect(item.id)"
						/>
					</template>
				</N8nPopover>
				<!-- Items without children -->
				<N8nMenuItem
					v-else
					:data-test-id="`main-sidebar-${item.id}`"
					:item="item"
					:compact="isCollapsed"
					@click="() => handleSelect(item.id)"
				/>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.bottomMenu {
	display: flex;
	flex-direction: column;
	margin-top: auto;

	&.collapsed {
		border-top: var(--border);
	}
}

.bottomMenuItems {
	padding: var(--spacing--3xs);
}

.popover {
	padding: var(--spacing--4xs);
	min-width: 260px;
	border-radius: var(--radius);
	background-color: var(--menu--color--background, var(--color--background--light-2));
}

.popoverTitle {
	display: block;
	margin-bottom: var(--spacing--3xs);
	padding-left: var(--spacing--3xs);
	margin-top: var(--spacing--xs);
}

.divider {
	display: block;
	width: 100%;
	padding-top: var(--spacing--3xs);
	border-bottom: var(--border);
	margin-bottom: var(--spacing--3xs);
	background-color: var(--color--border);
}

@media screen and (max-height: 470px) {
	:global(#help) {
		display: none;
	}
}
</style>
