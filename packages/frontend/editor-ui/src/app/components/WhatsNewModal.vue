<script setup lang="ts">
import dateformat from 'dateformat';
import { useI18n } from '@n8n/i18n';
import {
	CHANGELOG_URL,
	RELEASE_NOTES_URL,
	VERSIONS_MODAL_KEY,
	WHATS_NEW_MODAL_KEY,
} from '@/app/constants';
import { useVersionsStore } from '@n8n/stores/versions.store';
import { computed, nextTick, ref } from 'vue';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useArticleReadTracker } from '@/app/composables/useArticleReadTracker';
import { useUIStore } from '@/app/stores/ui.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { splitWhatsNewArticleCta } from '@/app/utils/whatsNewArticleUtils';

import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nMarkdown,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';

const props = defineProps<{
	modalName: string;
	data?: {
		articleId?: number;
	};
}>();

/** Articles are markdown with inline html; `@[youtube](id)` embeds a player. */
const MARKDOWN_OPTIONS = {
	markdown: {
		html: true,
		linkify: true,
		typographer: true,
		breaks: true,
	},
	tasklists: {
		enabled: false,
	},
	linkAttributes: {
		attrs: {
			target: '_blank',
			rel: 'noopener',
		},
	},
	// No fixed height: the stylesheet sizes the player to 16:9.
	youtube: {
		width: '100%',
	},
};

const i18n = useI18n();
const versionsStore = useVersionsStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const telemetry = useTelemetry();
const pageRedirectionHelper = usePageRedirectionHelper();

const containerRef = ref<HTMLElement | null>(null);
const articleRefs = ref<Record<number, HTMLElement>>({});

const nextVersions = computed(() => versionsStore.nextVersions);

const articles = computed(() =>
	versionsStore.whatsNewArticles.map((article) => ({
		id: article.id,
		title: article.title,
		publishedAt: article.publishedAt,
		date: dateformat(article.publishedAt, 'd mmmm yyyy'),
		...splitWhatsNewArticleCta(article.content),
	})),
);

/** The dialog body is the scroll container; the articles sit inside it. */
const scrollContainer = computed(
	() => containerRef.value?.closest<HTMLElement>('[data-slot="dialog-body"]') ?? null,
);

const { scrollQuietly } = useArticleReadTracker({
	container: scrollContainer,
	articles: () =>
		articles.value.flatMap(({ id }) => {
			const el = articleRefs.value[id];
			return el ? [{ id, el }] : [];
		}),
	onRead: (id) => versionsStore.setWhatsNewArticleRead(id),
});

function registerArticle(id: number, el: unknown) {
	if (el instanceof HTMLElement) articleRefs.value[id] = el;
}

const openUpdatesPanel = () => {
	uiStore.openModal(VERSIONS_MODAL_KEY);
};

const onUpdateClick = async () => {
	telemetry.track('User clicked on update button', {
		source: 'whats-new-modal',
	});

	await pageRedirectionHelper.goToVersions();
};

const onOpenChange = (open: boolean) => {
	if (!open) uiStore.closeModal(WHATS_NEW_MODAL_KEY);
};

// Fires once the dialog is on screen and has focus, so the body can scroll.
const onOpened = async () => {
	// The article the reader asked for is the only one that counts as read on
	// open. The others count once the reader scrolls to them; see the tracker.
	const targetId = props.data?.articleId ?? articles.value[0]?.id;
	if (targetId === undefined) return;

	versionsStore.setWhatsNewArticleRead(targetId);

	// The body opens at the top, where the first post already is, with the
	// update notice leading it. Scrolling there would only hide the notice.
	if (targetId === articles.value[0]?.id) return;

	await nextTick();
	const target = articleRefs.value[targetId];
	if (!target) return;

	// A jump, not a glide: the reader chose this article, so the dialog
	// should open on it rather than travel past the ones above.
	await scrollQuietly(() => {
		target.scrollIntoView({ behavior: 'instant', block: 'start' });
	});
};
</script>

<template>
	<!--
		The 2xlarge preset leaves the settings content width (45rem) for the
		articles once the dialog's own padding is taken off. The height cap is
		the pattern from the design system's scrollable dialog examples.
	-->
	<N8nDialog
		:open="true"
		size="2xlarge"
		:container-class="$style.dialog"
		:style="{ maxHeight: 'min(52rem, calc(100dvh - var(--spacing--lg)))' }"
		data-test-id="whatsNew-modal"
		@update:open="onOpenChange"
		@open-auto-focus="onOpened"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>{{ i18n.baseText('whatsNew.heading') }}</N8nDialogTitle>
		</N8nDialogHeader>

		<N8nDialogBody :class="$style.scroller">
			<div ref="containerRef">
				<!-- Leads the first post and scrolls with it. The footer carries the standing nudge. -->
				<N8nCallout
					v-if="versionsStore.hasSignificantUpdates"
					theme="warning"
					:class="$style.notice"
					data-test-id="whats-new-modal-update-notice"
				>
					{{
						i18n.baseText('whatsNew.updateAvailable', {
							interpolate: {
								currentVersion: versionsStore.currentVersion?.name ?? 'unknown',
								latestVersion: versionsStore.latestVersion?.name,
								count: nextVersions.length,
							},
						})
					}}
					<N8nLink
						size="small"
						:underline="true"
						theme="text"
						:to="RELEASE_NOTES_URL"
						new-window
						:class="$style.noticeLink"
					>
						{{ i18n.baseText('whatsNew.updateAvailable.changelogLink') }}
					</N8nLink>
				</N8nCallout>

				<article
					v-for="article in articles"
					:key="article.id"
					:ref="(el) => registerArticle(article.id, el)"
					:class="$style.article"
					:data-test-id="`whats-new-item-${article.id}`"
				>
					<N8nText
						tag="time"
						size="small"
						color="text-light"
						:class="$style.date"
						:datetime="article.publishedAt"
						data-test-id="whats-new-item-date"
					>
						{{ article.date }}
					</N8nText>
					<!-- The dialog title is the h2, so the articles nest under it. -->
					<N8nHeading tag="h3" size="xlarge" bold :class="$style.title">
						{{ article.title }}
					</N8nHeading>
					<N8nMarkdown
						v-if="article.body"
						:content="article.body"
						:class="$style.body"
						:options="MARKDOWN_OPTIONS"
					/>
					<div v-if="article.cta" :class="$style.actions">
						<N8nButton
							variant="outline"
							size="medium"
							:href="article.cta.href"
							target="_blank"
							data-test-id="whats-new-item-cta"
						>
							{{ article.cta.label }}
							<N8nIcon icon="external-link" size="small" />
						</N8nButton>
					</div>
				</article>

				<N8nMarkdown
					v-if="versionsStore.whatsNew.footer"
					:content="versionsStore.whatsNew.footer"
					:class="[$style.body, $style.footer]"
					:options="MARKDOWN_OPTIONS"
				/>
			</div>
		</N8nDialogBody>

		<!-- Secondary before primary, as in the design system's dialog footers. -->
		<N8nDialogFooter :class="$style.actionsFooter">
			<N8nLink
				v-if="versionsStore.hasVersionUpdates"
				size="small"
				theme="text"
				:class="$style.versionsBehind"
				data-test-id="whats-new-modal-next-versions-link"
				@click="openUpdatesPanel"
			>
				{{
					i18n.baseText('whatsNew.versionsBehindLink', {
						adjustToNumber: nextVersions.length,
						interpolate: {
							count: nextVersions.length > 99 ? '99+' : nextVersions.length,
						},
					})
				}}
			</N8nLink>
			<N8nButton
				variant="outline"
				size="medium"
				:href="CHANGELOG_URL"
				target="_blank"
				data-test-id="whats-new-modal-changelog-link"
			>
				{{ i18n.baseText('whatsNew.fullChangelog') }}
				<N8nIcon icon="external-link" size="small" />
			</N8nButton>
			<N8nTooltip
				v-if="versionsStore.hasVersionUpdates"
				:disabled="usersStore.canUserUpdateVersion"
				:content="i18n.baseText('whatsNew.updateNudgeTooltip')"
				placement="top"
			>
				<N8nButton
					size="medium"
					:label="i18n.baseText('whatsNew.update')"
					:disabled="!usersStore.canUserUpdateVersion"
					data-test-id="whats-new-modal-update-button"
					@click="onUpdateClick"
				/>
			</N8nTooltip>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

// A reading surface, so the regions get the wider padding step.
.dialog {
	--n8n-dialog-content--padding: var(--spacing--lg);
}

// The rule stands in for the divider of whichever article is scrolled to the top.
.scroller {
	border-block-start: var(--border);
}

// The callout on the status palette, same as the other status surfaces.
.notice {
	--callout--border-color--warning: var(--border-color--warning);
	--callout--color--background--warning: var(--background--warning);
	--callout--color--text--warning: var(--text-color--warning);
	--callout--icon-color--warning: var(--icon-color--warning);

	margin-top: var(--spacing--lg);
}

// The link keeps the callout's text colour, hovered too; the underline is enough.
// Nested under .notice to outrank the callout's own link rule.
.notice .noticeLink,
.notice .noticeLink > span,
.notice .noticeLink:hover > span {
	color: inherit;
}

// Articles scroll under the footer the same way they scroll under the header.
.actionsFooter {
	border-block-start: var(--border);
}

.versionsBehind {
	align-self: center;
	margin-inline-end: auto;
}

.article {
	padding-block: var(--spacing--xl);

	// The divider belongs to the article above. Scrolling to an article then
	// puts its top edge under the header rule, which takes the divider's place,
	// and the heading keeps its usual distance from the line above it.
	// The dialog footer carries a rule, so its own padding sits below the line and
	// the last article keeps its bottom padding to stay clear of it.
	&:not(:last-of-type) {
		border-bottom: var(--border);
	}

	// Scroll-driven: an article sharpens and fades in over its first 240px of
	// travel into view, and fades out over its last 240px, so stories hand over
	// as you read. No translate: the scroll is the only movement, so the eye
	// has one thing to follow.
	@supports (animation-timeline: view()) {
		--animation--fade-in--translate: 0;

		animation:
			fadeIn linear,
			fadeOut linear;
		animation-timeline: view();
		animation-range:
			entry 0 entry 240px,
			exit calc(100% - 240px) exit 100%;
	}

	@include motion.reduced-motion;
}

.date {
	display: block;
	margin-bottom: var(--spacing--3xs);
	font-variant-numeric: tabular-nums;
}

.title {
	display: block;
	margin-bottom: var(--spacing--sm);
	color: var(--color--text--shade-1);
	line-height: var(--line-height--md);
	letter-spacing: -0.01em;
	text-wrap: pretty;
}

// One type scale for the article body. The shared markdown skin sizes
// everything to its base size; this sets that base and the rhythm around it.
.body {
	--n8n-markdown--base-font-size: var(--font-size--sm);

	color: var(--color--text);

	p,
	li {
		font-size: var(--font-size--sm);
		line-height: var(--line-height--xl);
	}

	p {
		margin: 0 0 var(--spacing--sm);
	}

	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		margin: var(--spacing--lg) 0 var(--spacing--2xs);
		color: var(--color--text--shade-1);
		font-size: var(--font-size--md);
		font-weight: var(--font-weight--bold);
		line-height: var(--line-height--md);
		letter-spacing: -0.005em;
	}

	h1,
	h2 {
		font-size: var(--font-size--lg);
	}

	ul,
	ol {
		margin: 0 0 var(--spacing--sm);
		padding-left: var(--spacing--md);
	}

	li {
		margin: 0;

		& + li {
			margin-top: var(--spacing--3xs);
		}

		&::marker {
			color: var(--color--text--tint-1);
		}
	}

	strong,
	b {
		color: var(--color--text--shade-1);
		font-weight: var(--font-weight--bold);
	}

	// Media sit in their own frame. Players are 16:9 whatever the embed says;
	// images keep their own ratio.
	iframe,
	img,
	video {
		display: block;
		width: 100%;
		height: auto;
		margin: var(--spacing--md) 0;
		border: var(--border);
		border-radius: var(--radius--sm);
		background: var(--color--background);
	}

	iframe {
		aspect-ratio: 16 / 9;
	}

	hr {
		margin: var(--spacing--lg) 0;
		border: 0;
		border-top: var(--border);
	}

	pre {
		margin: var(--spacing--sm) 0;
	}

	details {
		margin: 0 0 var(--spacing--sm);
	}

	// The article frame carries the spacing after the last block.
	> div > :last-child {
		margin-bottom: 0;
	}
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--md);

	a,
	button {
		gap: var(--spacing--3xs);
	}
}

// When present it is the last block, so it takes the article's clearance from the dialog footer.
.footer {
	padding-block: var(--spacing--lg) var(--spacing--xl);
	border-top: var(--border);
	color: var(--color--text--tint-1);
}
</style>
