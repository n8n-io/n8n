<script setup lang="ts">
import { N8nIconButton, N8nMenuItem, N8nScrollArea, N8nText } from '@n8n/design-system';
import type { IMenuItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import RecentChatIcon from '@/features/agents/n8nChatPage/components/RecentChatIcon.vue';
import { useAgentsN8nChatFlag } from '@/features/agents/composables/useAgentsN8nChatFlag';
import type { AppNavLink, AppNavSection } from './useAppNavigation';

defineProps<{
	title: string;
	sections: AppNavSection[];
	/** The panel is part of the layout; otherwise it floats over the page. */
	isExpanded: boolean;
}>();

const emit = defineEmits<{
	toggle: [];
	search: [event: MouseEvent];
	navigate: [link: AppNavLink];
	unfavorite: [link: AppNavLink];
}>();

const i18n = useI18n();
const settingsStore = useSettingsStore();
const isAgentsN8nChatFlag = useAgentsN8nChatFlag();

const toMenuItem = (link: AppNavLink): IMenuItem => ({
	id: link.id,
	label: link.label,
	icon: link.icon,
	preview: link.preview,
	route: { to: link.to },
});
</script>

<template>
	<div :class="$style.panel" data-test-id="app-nav-panel">
		<header :class="$style.header">
			<N8nText tag="h2" size="large" bold color="text-dark" :class="$style.title">
				{{ title }}
			</N8nText>
			<KeyboardShortcutTooltip
				v-if="!settingsStore.isCanvasOnly"
				placement="bottom"
				:show-after="500"
				:label="i18n.baseText('nodeView.openCommandBar')"
				:shortcut="{ keys: ['k'], metaKey: true }"
			>
				<N8nIconButton
					variant="ghost"
					size="small"
					icon="search"
					icon-size="large"
					:aria-label="i18n.baseText('nodeView.openCommandBar')"
					data-test-id="app-nav-search"
					@click="emit('search', $event)"
				/>
			</KeyboardShortcutTooltip>
			<KeyboardShortcutTooltip
				placement="bottom"
				:show-after="500"
				:label="
					isExpanded
						? i18n.baseText('mainSidebar.state.collapse')
						: i18n.baseText('mainSidebar.state.expand')
				"
				:shortcut="{ keys: ['['] }"
			>
				<N8nIconButton
					variant="ghost"
					size="small"
					icon="panel-left"
					icon-size="large"
					:aria-label="
						isExpanded
							? i18n.baseText('mainSidebar.state.collapse')
							: i18n.baseText('mainSidebar.state.expand')
					"
					data-test-id="app-nav-toggle"
					@click="emit('toggle')"
				/>
			</KeyboardShortcutTooltip>
		</header>
		<N8nScrollArea :class="$style.scroll">
			<nav :class="$style.sections" :aria-label="title">
				<section
					v-for="section in sections"
					:key="section.id"
					:class="$style.section"
					:data-test-id="`app-nav-section-${section.id}`"
				>
					<div v-if="section.title" :class="$style.sectionHeader">
						<N8nText size="small" bold color="text-light">{{ section.title }}</N8nText>
						<RouterLink
							v-if="section.viewAll"
							:to="section.viewAll.to"
							:class="$style.viewAll"
							data-test-id="app-nav-view-all"
						>
							{{ section.viewAll.label }}
						</RouterLink>
					</div>
					<N8nText
						v-if="section.links.length === 0 && section.emptyText"
						size="small"
						color="text-light"
						:class="$style.emptyText"
						data-test-id="app-nav-section-empty"
					>
						{{ section.emptyText }}
					</N8nText>
					<div
						v-for="link in section.links"
						:key="link.id"
						:class="[$style.link, { [$style.inactive]: !link.active }]"
						data-test-id="app-nav-link"
						:data-active="link.active"
						@click="emit('navigate', link)"
					>
						<N8nMenuItem :item="toMenuItem(link)" :active="link.active" scroll-label-on-overflow>
							<template v-if="link.chat && isAgentsN8nChatFlag" #icon>
								<RecentChatIcon :item="link.chat" />
							</template>
						</N8nMenuItem>
						<N8nIconButton
							v-if="link.favorite"
							:class="$style.unfavorite"
							variant="ghost"
							size="mini"
							icon="x"
							:aria-label="i18n.baseText('favorites.remove')"
							data-test-id="app-nav-unfavorite"
							@click.stop.prevent="emit('unfavorite', link)"
						/>
					</div>
				</section>
			</nav>
		</N8nScrollArea>
	</div>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	min-height: 0;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: var(--spacing--2xl);
	padding: 0 var(--spacing--3xs) 0 var(--spacing--sm);
	flex: none;
}

.title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.scroll {
	flex: 1;
	min-height: 0;
}

.sections {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--4xs) var(--spacing--2xs) var(--spacing--sm);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.sectionHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--4xs) var(--spacing--3xs);
}

.viewAll {
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	text-decoration: none;

	&:hover,
	&:focus-visible {
		color: var(--text-color--subtle);
	}
}

// A router link is marked active on any route below its path; only our own state counts.
.link {
	position: relative;

	// The unstar button shows on hover, over the end of the row.
	&:hover .unfavorite,
	.unfavorite:focus-visible {
		opacity: 1;
	}
}

.unfavorite {
	position: absolute;
	top: 50%;
	right: var(--spacing--4xs);
	transform: translateY(-50%);
	opacity: 0;
}

@media (hover: none) {
	.unfavorite {
		opacity: 1;
	}
}

.inactive {
	:global(.router-link-active) {
		background-color: transparent;
	}

	:global(.router-link-active:hover) {
		background-color: var(--background--hover);
	}
}

.emptyText {
	display: block;
	padding: var(--spacing--4xs) var(--spacing--3xs);
}
</style>
