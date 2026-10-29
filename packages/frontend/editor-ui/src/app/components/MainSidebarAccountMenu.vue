<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
	N8nAvatar,
	N8nDropdownMenu,
	N8nDropdownMenuItem,
	N8nIcon,
	N8nText,
	N8nTooltip,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useElementOverflow } from '@n8n/composables/useElementOverflow';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useVersionsStore } from '@n8n/stores/versions.store';
import { ABOUT_MODAL_KEY, VERSIONS_MODAL_KEY, VIEWS, WHATS_NEW_MODAL_KEY } from '@/app/constants';
import { EXTERNAL_LINKS } from '@/app/constants/externalLinks';
import { useBugReporting } from '@/app/composables/useBugReporting';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useUIStore } from '@/app/stores/ui.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { hasPermission } from '@/app/utils/rbac/permissions';

/** A help row either opens a link or carries a caption, like the version on About. */
type HelpEntry = DropdownMenuItemProps<string, { href?: string; caption?: string }>;

const props = defineProps<{ isCollapsed: boolean }>();

const i18n = useI18n();
const router = useRouter();
const telemetry = useTelemetry();
const pageRedirectionHelper = usePageRedirectionHelper();
const { getReportingURL } = useBugReporting();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const versionsStore = useVersionsStore();
const workflowDocumentStore = injectWorkflowDocumentStore();

const isOpen = ref(false);

// Opens are counted here rather than on the trigger's click, so the keyboard path counts
// too and a click that closes the menu does not.
watch(isOpen, (open) => {
	if (!open) return;
	telemetry.track(TELEMETRY_EVENT.PLATFORM.USER_OPENED_ACCOUNT_MENU, {
		sidebar_collapsed: props.isCollapsed,
	});
});

const user = computed(() => usersStore.currentUser);

// A long name is cut with an ellipsis; the full text is then a tooltip. The row's name only
// exists while the sidebar is expanded, and the header only while the menu is open, so the
// checks follow their elements.
const nameEl = ref<HTMLElement | null>(null);
const headerNameEl = ref<HTMLElement | null>(null);
const headerEmailEl = ref<HTMLElement | null>(null);
const { isOverflowing: isNameTruncated } = useElementOverflow(nameEl, 'x', [
	() => user.value?.fullName,
]);
const { isOverflowing: isHeaderNameTruncated } = useElementOverflow(headerNameEl, 'x', [
	() => user.value?.fullName,
]);
const { isOverflowing: isHeaderEmailTruncated } = useElementOverflow(headerEmailEl, 'x', [
	() => user.value?.email,
]);
// The rail has no room for the name at all; the expanded row shows it when it fits.
const showNameTooltip = computed(
	() => !isOpen.value && (props.isCollapsed || isNameTruncated.value),
);

const showCloudConsole = computed(
	() => settingsStore.isCloudDeployment && hasPermission(['instanceOwner']),
);

const whatsNewArticles = computed(() => versionsStore.whatsNewArticles);
const firstUnreadArticle = computed(() =>
	whatsNewArticles.value.find((article) => !versionsStore.isWhatsNewArticleRead(article.id)),
);
// A pending update is news too: the row is there for it even before the first article lands.
const hasWhatsNew = computed(
	() => whatsNewArticles.value.length > 0 || versionsStore.hasVersionUpdates,
);
// The dot on the avatar carries the signal the Help row used to show.
const hasUnread = computed(
	() => firstUnreadArticle.value !== undefined || versionsStore.hasVersionUpdates,
);

const helpEntries = computed<HelpEntry[]>(() => [
	{
		id: 'quickstart',
		testId: 'main-sidebar-help-quickstart',
		label: i18n.baseText('mainSidebar.helpMenuItems.quickstart'),
		icon: { type: 'icon', value: 'video' },
		data: { href: EXTERNAL_LINKS.QUICKSTART_VIDEO },
	},
	{
		id: 'docs',
		testId: 'main-sidebar-help-docs',
		label: i18n.baseText('mainSidebar.helpMenuItems.documentation'),
		icon: { type: 'icon', value: 'book-open' },
		data: { href: EXTERNAL_LINKS.DOCUMENTATION },
	},
	{
		id: 'forum',
		testId: 'main-sidebar-help-forum',
		label: i18n.baseText('mainSidebar.helpMenuItems.forum'),
		icon: { type: 'icon', value: 'book' },
		data: { href: EXTERNAL_LINKS.FORUM },
	},
	{
		id: 'examples',
		testId: 'main-sidebar-help-examples',
		label: i18n.baseText('mainSidebar.helpMenuItems.course'),
		icon: { type: 'icon', value: 'graduation-cap' },
		data: { href: EXTERNAL_LINKS.COURSES },
	},
	...(settingsStore.isCloudDeployment
		? [
				{
					id: 'contact-support',
					testId: 'main-sidebar-help-contact-support',
					label: i18n.baseText('mainSidebar.helpMenuItems.contactSupport'),
					icon: { type: 'icon', value: 'life-buoy' },
					data: { href: EXTERNAL_LINKS.SUPPORT },
				} satisfies HelpEntry,
			]
		: []),
	{
		id: 'report-bug',
		testId: 'main-sidebar-help-report-bug',
		label: i18n.baseText('mainSidebar.helpMenuItems.reportBug'),
		icon: { type: 'icon', value: 'bug' },
		data: { href: getReportingURL() },
	},
	{
		id: 'about',
		testId: 'main-sidebar-help-about',
		divided: true,
		label: i18n.baseText('mainSidebar.aboutN8n'),
		icon: { type: 'icon', value: 'info' },
		data: {
			caption: i18n.baseText('mainSidebar.accountMenu.version', {
				interpolate: { version: rootStore.versionCli },
			}),
		},
	},
]);

type AccountMenuItem = 'cloud_console' | 'personal_settings' | 'whats_new' | 'sign_out';

function track(item: AccountMenuItem) {
	telemetry.track(TELEMETRY_EVENT.PLATFORM.USER_CLICKED_ACCOUNT_MENU_ITEM, {
		item,
		sidebar_collapsed: props.isCollapsed,
	});
}

function onCloudConsole() {
	track('cloud_console');
	void pageRedirectionHelper.goToDashboard();
}

function onPersonalSettings() {
	track('personal_settings');
	void router.push({ name: VIEWS.PERSONAL_SETTINGS });
}

function onWhatsNew() {
	track('whats_new');
	const article = firstUnreadArticle.value ?? whatsNewArticles.value[0];
	if (article) {
		uiStore.openModalWithData({
			name: WHATS_NEW_MODAL_KEY,
			data: { articleId: article.id },
		});
		return;
	}
	// No articles yet, so the news is the update itself: open the versions panel directly.
	uiStore.openModal(VERSIONS_MODAL_KEY);
}

// Menu rows are not anchors, so the link is followed here.
function onHelpSelect(id: string) {
	telemetry.track('User clicked help resource', {
		type: id,
		workflow_id: workflowDocumentStore.value.workflowId,
	});
	if (id === 'about') {
		uiStore.openModal(ABOUT_MODAL_KEY);
		return;
	}
	const href = helpEntries.value.find((entry) => entry.id === id)?.data?.href;
	if (href) window.open(href, '_blank', 'noopener');
}

function onSignOut() {
	track('sign_out');
	void router.push({ name: VIEWS.SIGNOUT });
}
</script>

<template>
	<div
		:class="[$style.account, { [$style.collapsed]: isCollapsed }]"
		data-test-id="main-sidebar-account"
	>
		<!-- The full name as a tooltip: always on the rail, on the row only when it is cut. -->
		<N8nTooltip
			:disabled="!showNameTooltip"
			:content="user?.fullName"
			placement="right"
			:show-after="500"
		>
			<N8nDropdownMenu
				v-model="isOpen"
				:items="[]"
				:placement="isCollapsed ? 'right-end' : 'top-start'"
				width="var(--spacing--5xl)"
				:extra-popper-class="$style.menu"
				content-test-id="main-sidebar-account-menu"
			>
				<template #trigger>
					<button
						type="button"
						:class="$style.trigger"
						:aria-label="isCollapsed ? user?.fullName : undefined"
						data-test-id="main-sidebar-account-trigger"
					>
						<span :class="$style.avatar">
							<!-- Expanded: the avatar is the row's icon, so it takes the icon's 16px. -->
							<N8nAvatar
								:first-name="user?.firstName"
								:last-name="user?.lastName"
								:size="isCollapsed ? 'small' : 'xxsmall'"
							/>
							<span
								v-if="hasUnread"
								:class="$style.unreadDot"
								data-test-id="main-sidebar-account-unread"
							/>
						</span>
						<template v-if="!isCollapsed">
							<span ref="nameEl" :class="$style.name" data-test-id="main-sidebar-account-name">{{
								user?.fullName
							}}</span>
							<N8nIcon icon="chevrons-up-down" size="large" :class="$style.chevron" />
						</template>
					</button>
				</template>

				<template #content>
					<div :class="$style.header" data-test-id="main-sidebar-account-header">
						<N8nAvatar :first-name="user?.firstName" :last-name="user?.lastName" size="small" />
						<div :class="$style.identity">
							<!-- Name at the menu's item size; the email one step down, as a caption. -->
							<N8nTooltip
								:disabled="!isHeaderNameTruncated"
								:content="user?.fullName"
								placement="top-start"
								:show-after="500"
							>
								<span
									ref="headerNameEl"
									:class="$style.line"
									data-test-id="main-sidebar-account-header-name"
								>
									<N8nText size="medium" bold color="text-dark">{{ user?.fullName }}</N8nText>
								</span>
							</N8nTooltip>
							<N8nTooltip
								:disabled="!isHeaderEmailTruncated"
								:content="user?.email"
								placement="top-start"
								:show-after="500"
							>
								<span
									ref="headerEmailEl"
									:class="$style.line"
									data-test-id="main-sidebar-account-header-email"
								>
									<N8nText size="small" color="text-light">{{ user?.email }}</N8nText>
								</span>
							</N8nTooltip>
						</div>
					</div>

					<div :class="$style.items" data-menu-items>
						<N8nDropdownMenuItem
							v-if="showCloudConsole"
							id="cloud-console"
							test-id="main-sidebar-account-cloud-console"
							:label="i18n.baseText('mainSidebar.cloudConsole')"
							:icon="{ type: 'icon', value: 'cloud' }"
							@select="onCloudConsole"
						>
							<template #item-trailing="{ ui }">
								<N8nIcon icon="external-link" size="small" :class="[ui.class, $style.external]" />
							</template>
						</N8nDropdownMenuItem>
						<N8nDropdownMenuItem
							id="personal-settings"
							test-id="main-sidebar-account-personal-settings"
							:divided="showCloudConsole"
							:label="i18n.baseText('mainSidebar.personalSettings')"
							:icon="{ type: 'icon', value: 'circle-user-round' }"
							@select="onPersonalSettings"
						/>
						<N8nDropdownMenuItem
							v-if="hasWhatsNew"
							id="whats-new"
							test-id="main-sidebar-account-whats-new"
							:label="i18n.baseText('mainSidebar.whatsNew')"
							:icon="{ type: 'icon', value: 'bell' }"
							@select="onWhatsNew"
						>
							<template #item-trailing="{ ui }">
								<span
									v-if="hasUnread"
									:class="[ui.class, $style.menuDot]"
									data-test-id="main-sidebar-account-whats-new-unread"
								/>
							</template>
						</N8nDropdownMenuItem>
						<N8nDropdownMenuItem
							id="help"
							test-id="main-sidebar-account-help"
							:label="i18n.baseText('mainSidebar.help')"
							:icon="{ type: 'icon', value: 'circle-help' }"
							:children="helpEntries"
							@select="onHelpSelect"
						>
							<template #item-trailing="{ item, ui }">
								<!-- One step below the label, like the email under the name. -->
								<N8nText
									v-if="item.data?.caption"
									size="small"
									color="text-light"
									:class="[ui.class, $style.caption]"
								>
									{{ item.data.caption }}
								</N8nText>
								<N8nIcon
									v-else-if="item.data?.href"
									icon="external-link"
									size="small"
									:class="[ui.class, $style.external]"
								/>
							</template>
						</N8nDropdownMenuItem>
						<N8nDropdownMenuItem
							id="sign-out"
							test-id="main-sidebar-log-out"
							divided
							:label="i18n.baseText('auth.signout')"
							:icon="{ type: 'icon', value: 'log-out' }"
							@select="onSignOut"
						/>
					</div>
				</template>
			</N8nDropdownMenu>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

.account {
	padding: var(--spacing--3xs);
	// A hairline at half strength: the row belongs to the block above, it is not a new section.
	border-top: var(--border-width) var(--border-style)
		color-mix(in srgb, var(--border-color) 50%, transparent);

	// The tooltip wraps the trigger in a span; it has to take the row's width.
	> span {
		display: block;
	}

	&.collapsed {
		display: flex;
		justify-content: center;
		padding: var(--spacing--3xs) 0 var(--spacing--2xs);
		border-top: var(--border);
	}
}

// Same box, padding, gap and text as the menu items above, so the row reads as one of them.
.trigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	width: 100%;
	height: var(--spacing--xl);
	padding: var(--spacing--4xs);
	border: 1px solid transparent;
	border-radius: var(--radius);
	background: none;
	color: var(--color--text--shade-1);
	font: inherit;
	text-align: left;
	cursor: pointer;
	transition:
		background-color var(--duration--snappy) var(--easing--ease-out),
		transform var(--duration--snappy) var(--easing--ease-out);

	&:hover,
	&[data-state='open'] {
		background-color: var(--color--background--light-1);

		.chevron {
			color: var(--color--text--shade-1);
		}
	}

	// Pressed: a nudge, not a bounce. The release snaps back with the same curve.
	&:active {
		transform: scale(0.98);
	}

	&:focus-visible {
		@include focus.focus-ring-with-border;
		outline-offset: -1px;
	}

	.collapsed & {
		width: var(--height--sm);
		height: var(--height--sm);
		padding: 0;
		gap: 0;
		border-radius: var(--radius--full);
		justify-content: center;

		// The avatar fills the circle, so the states draw a ring around it instead of a fill.
		&:hover {
			background: none;
			box-shadow:
				0 0 0 2px var(--menu--color--background),
				0 0 0 3px var(--border-color);
		}

		&[data-state='open'] {
			background: none;
			box-shadow:
				0 0 0 2px var(--menu--color--background),
				0 0 0 3px var(--focus--border-color);
		}
	}
}

.avatar {
	position: relative;
	flex: none;
	display: flex;
	align-items: center;
	justify-content: center;
	// The icon column of the rows above: a 24px box with the glyph centred in it.
	width: var(--spacing--lg);
	height: var(--spacing--lg);

	.collapsed & {
		width: var(--height--sm);
		height: var(--height--sm);
	}
}

.unreadDot {
	position: absolute;
	// Clips the avatar's corner rather than the column's: the avatar sits 4px inside the box.
	top: var(--spacing--5xs);
	right: var(--spacing--5xs);
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	border-radius: var(--radius--full);
	background-color: var(--color--danger);
	// The ring lifts the dot off the avatar, like a badge on an app icon.
	box-shadow: 0 0 0 2px var(--menu--color--background);

	.collapsed & {
		top: 0;
		right: 0;
	}
}

.name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	line-height: var(--font-size--lg);
}

.chevron {
	flex: none;
	color: var(--color--text--tint-1);
	transition: color var(--duration--snappy) var(--easing--ease-out);
}

/*
 * One fixed width, so the panel does not grow or shrink with the user's name; the header
 * cuts the name instead. Doubled to outrank the menu's own fit-content rule.
 */
.menu.menu {
	width: var(--spacing--5xl);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--2xs) var(--spacing--2xs);
	border-bottom: var(--border);
}

/* The text sizes bring their own line height, so the two lines need no gap. */
.identity {
	display: flex;
	flex-direction: column;
	min-width: 0;
	flex: 1;

	// The tooltip wraps each line in a span; it has to take the column's width.
	> span {
		display: block;
		min-width: 0;
	}
}

.line {
	display: block;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

/* Same inset and rhythm as the menu's own item list. */
.items {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding: var(--spacing--4xs);
}

.external {
	color: var(--color--text--tint-1);
}

// The submenu is as wide as its widest row, so this gap is what keeps the
// caption off the label and gives the panel its width.
.caption {
	padding-left: var(--spacing--lg);
	font-variant-numeric: tabular-nums;
}

.menuDot {
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	border-radius: var(--radius--full);
	background-color: var(--color--danger);
}

@media (prefers-reduced-motion: reduce) {
	.trigger,
	.chevron {
		transition: none;
	}

	.trigger:active {
		transform: none;
	}
}
</style>
