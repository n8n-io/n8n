<script setup lang="ts">
import { computed, shallowReactive, type ComponentPublicInstance } from 'vue';
import { N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useVersionsStore } from '@n8n/stores/versions.store';
import type { WhatsNewArticle } from '@n8n/rest-api-client/api/versions';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { WHATS_NEW_MODAL_KEY } from '@/app/constants';
import { useSwipeToDismiss } from '@/app/composables/useSwipeToDismiss';
import { useUIStore } from '@/app/stores/ui.store';
import { getWhatsNewArticleImage } from '@/app/utils/whatsNewArticleUtils';
import WhatsNewCardIllustration from '@/app/components/WhatsNewCardIllustration.vue';

type DismissMethod = 'button' | 'swipe' | 'keyboard';

/** The front card plus the cards that show behind it. */
const MAX_LAYERS = 3;

const i18n = useI18n();
const telemetry = useTelemetry();
const uiStore = useUIStore();
const versionsStore = useVersionsStore();

const articles = computed(() => versionsStore.whatsNewCardArticles);
const frontArticle = computed(() => articles.value.at(0));
// Painted back to front, so the front card is the last child. Keyed by article: when the front
// card leaves, the card behind keeps its element and only changes depth, so its motion continues.
const layers = computed(() =>
	articles.value
		.slice(0, MAX_LAYERS)
		.map((article, depth) => ({ article, depth }))
		.reverse(),
);

const layerElements = shallowReactive(new Map<number, HTMLElement>());
function registerLayer(el: Element | ComponentPublicInstance | null, id: number) {
	if (el instanceof HTMLElement) layerElements.set(id, el);
	else layerElements.delete(id);
}
const frontElement = computed(() =>
	frontArticle.value ? (layerElements.get(frontArticle.value.id) ?? null) : null,
);

// The method is recorded when the gesture starts, since the swipe reports back only once the card is gone.
let pendingMethod: DismissMethod = 'swipe';

const {
	style: swipeStyle,
	progress,
	isDragging,
	isSettling,
	isLeaving,
	dismiss: flyOut,
	onPointerDown,
	onWheel,
	onClickCapture,
} = useSwipeToDismiss({
	target: frontElement,
	onDismiss: () => {
		if (frontArticle.value) markRead(frontArticle.value, pendingMethod);
		pendingMethod = 'swipe';
	},
});

/** The front card is scripted (by the pointer or a spring), so its own transitions must stay off. */
const isHeld = computed(() => isDragging.value || isSettling.value);
/** The pointer moves the stack frame by frame; transitions would only lag behind it. */
const isTracking = computed(() => isDragging.value && !isLeaving.value);
/** How far the cards behind have stepped forward: with the drag, and all the way once the front leaves. */
const stackProgress = computed(() => (isLeaving.value ? 1 : progress.value));

function imageFor(article: WhatsNewArticle) {
	return getWhatsNewArticleImage(article.content);
}

function openArticle(article: WhatsNewArticle) {
	telemetry.track("User clicked on what's new notification", {
		article_id: article.id,
		source: 'sidebar_card',
	});
	uiStore.openModalWithData({
		name: WHATS_NEW_MODAL_KEY,
		data: { articleId: article.id },
	});
}

function markRead(article: WhatsNewArticle, method: DismissMethod) {
	const remainingCount = articles.value.filter(({ id }) => id !== article.id).length;
	versionsStore.setWhatsNewArticleRead(article.id);
	telemetry.track(TELEMETRY_EVENT.PLATFORM.USER_DISMISSED_WHATS_NEW_CARD, {
		article_id: article.id,
		method,
		remaining_count: remainingCount,
	});
}

/** The button and the keyboard leave the same way a swipe does, so every exit reads alike. */
function dismiss(method: DismissMethod) {
	pendingMethod = method;
	flyOut(1);
}
</script>

<template>
	<div
		v-if="frontArticle"
		:class="[
			$style.wrapper,
			{ [$style.hasQueue]: layers.length > 1, [$style.tracking]: isTracking },
		]"
		:style="{ '--stack--progress': stackProgress }"
		data-test-id="whats-new-card"
	>
		<article
			v-for="{ article, depth } in layers"
			:key="article.id"
			:ref="(el) => registerLayer(el, article.id)"
			:class="[
				$style.card,
				depth === 0 ? $style.front : depth === 1 ? $style.near : $style.far,
				{ [$style.held]: depth === 0 && isHeld, [$style.leaving]: depth === 0 && isLeaving },
			]"
			:style="depth === 0 ? swipeStyle : undefined"
			:inert="depth > 0 || undefined"
			:aria-hidden="depth > 0 || undefined"
			:data-test-id="depth === 0 ? 'whats-new-card-front' : 'whats-new-card-back'"
			@pointerdown="onPointerDown"
			@wheel="onWheel"
			@click.capture="onClickCapture"
		>
			<div :class="$style.media">
				<img
					v-if="imageFor(article)"
					:src="imageFor(article)"
					alt=""
					loading="lazy"
					draggable="false"
					:class="$style.image"
					:data-test-id="depth === 0 ? 'whats-new-card-image' : undefined"
				/>
				<WhatsNewCardIllustration v-else :seed="article.id" />
				<template v-if="depth === 0">
					<span
						v-if="articles.length > 1"
						:class="$style.counter"
						data-test-id="whats-new-card-counter"
					>
						{{
							i18n.baseText('whatsNewCard.counter', {
								interpolate: { index: 1, count: articles.length },
							})
						}}
					</span>
					<!-- as-child: the button is the anchor, not a zero-size span left behind by the absolute button. -->
					<N8nTooltip :content="i18n.baseText('whatsNewCard.dismiss')" placement="top" as-child>
						<N8nIconButton
							icon="x"
							variant="ghost"
							size="xsmall"
							icon-only
							:class="$style.dismiss"
							:aria-label="i18n.baseText('whatsNewCard.dismiss')"
							data-swipe-ignore
							data-test-id="whats-new-card-dismiss"
							@click="dismiss('button')"
						/>
					</N8nTooltip>
				</template>
			</div>

			<!-- Stretched over the whole card, under the dismiss button. -->
			<button
				v-if="depth === 0"
				type="button"
				:class="[$style.body, $style.open]"
				:aria-label="i18n.baseText('whatsNewCard.open', { interpolate: { title: article.title } })"
				data-test-id="whats-new-card-open"
				@click="openArticle(article)"
				@keydown.delete.prevent="dismiss('keyboard')"
			>
				<span :class="$style.title" data-test-id="whats-new-card-title">
					{{ article.title }}
				</span>
			</button>
			<div v-else :class="$style.body">
				<span :class="$style.title">{{ article.title }}</span>
			</div>
		</article>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

.wrapper {
	// 0 at rest, 1 once the front card is gone; the drag sets it in between.
	--stack--progress: 0;
	position: relative;
	margin: 0 var(--spacing--3xs) var(--spacing--4xs);

	// Room for the edges of the two cards behind.
	&.hasQueue {
		margin-top: var(--spacing--xs);
	}
}

.card {
	// How many steps back the card sits, counted from the front, as the stack moves forward.
	--stack--offset: calc(var(--stack--depth) - var(--stack--progress));
	position: relative;
	z-index: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs);
	border-radius: var(--radius--sm);
	background: var(--background--surface);
	box-shadow: var(--shadow--outline), var(--shadow--xs);
	color: var(--color--text);
	// Scaled from the top edge, so a card behind grows down and out into the front slot.
	transform-origin: 50% 0;
	// The card owns sideways gestures; vertical ones still scroll the sidebar.
	touch-action: pan-y;
	overscroll-behavior-x: contain;
	user-select: none;
	-webkit-user-drag: none;
	// Position springs with a single rebound; focus and opacity never overshoot, so they ease.
	transition:
		transform var(--duration--base) var(--easing--spring),
		filter var(--duration--snappy) var(--easing--ease-out),
		opacity var(--duration--snappy) var(--easing--ease-out),
		box-shadow var(--duration--snappy) var(--easing--ease-out);

	@media (prefers-reduced-motion: reduce) {
		transition:
			opacity var(--duration--snappy) var(--easing--ease-out),
			box-shadow var(--duration--snappy) var(--easing--ease-out);
	}

	// The hover tint is a layer between the surface and the content, so it can fade.
	&::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 0;
		border-radius: inherit;
		background: var(--background--hover);
		opacity: 0;
		pointer-events: none;
		transition: opacity var(--duration--snappy) var(--easing--ease-out);
	}
}

// Explicit identity values, so the card stepping forward lands on the same computed values
// and its running transition carries straight through the swap.
.front {
	transform: translateY(0) scale(1);
}

// Pointing at the front card tints it, firms up its edge and lifts it a step,
// the same cues as a hoverable card. A card in the hand is being moved, not pointed at.
@media (hover: hover) and (pointer: fine) {
	.front:not(.held):hover {
		box-shadow:
			0 0 0 1px var(--border-color--strong),
			var(--shadow--sm);

		&::before {
			opacity: 1;
		}
	}
}

// Cards behind sit higher, smaller, and out of focus; each step back adds the same amount.
// The blur radius is not a token: no scale exists for depth of field.
.near,
.far {
	position: absolute;
	inset: 0;
	z-index: 0;
	pointer-events: none;
	transform: translateY(calc(-1 * var(--spacing--3xs) * var(--stack--offset)))
		scale(calc(1 - 0.04 * var(--stack--offset)));
	filter: blur(calc(1px * var(--stack--offset)));
	opacity: calc(1 - 0.08 * var(--stack--offset));
}

.near {
	--stack--depth: 1;
}

.far {
	--stack--depth: 2;
	animation: layerIn var(--duration--snappy) var(--easing--ease-out);

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
}

// A card that joins the back of the stack fades in instead of popping.
@keyframes layerIn {
	from {
		opacity: 0;
	}
}

// While the pointer holds the stack, the cards behind follow it frame by frame.
.tracking {
	.near,
	.far {
		transition: none;
	}

	// The front card is lifted off the stack and casts a deeper shadow.
	.front {
		cursor: grabbing;
		box-shadow: var(--shadow--outline), var(--shadow--md);
	}
}

// The front card is driven by the pointer or by a spring, never by a transition;
// only its shadow eases as it is picked up and as it lands.
.held {
	transition: box-shadow var(--duration--snappy) var(--easing--ease-out);
}

.leaving {
	pointer-events: none;
}

.media {
	position: relative;
	height: 84px;
	overflow: hidden;
	border-radius: var(--radius--2xs);
	background: var(--background--subtle);
}

.image {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: cover;
}

// Both overlays sit on a surface, so they read on a photo as well as on the illustration.
.counter {
	position: absolute;
	top: var(--spacing--4xs);
	left: var(--spacing--4xs);
	padding: 0 var(--spacing--4xs);
	border-radius: var(--radius--full);
	background: var(--background--surface);
	box-shadow: var(--shadow--outline), var(--shadow--xs);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	font-variant-numeric: tabular-nums;
	line-height: var(--line-height--xl);
	color: var(--color--text--tint-1);
}

.dismiss.dismiss {
	position: absolute;
	top: var(--spacing--4xs);
	right: var(--spacing--4xs);
	z-index: 2;
	border-radius: var(--radius--full);
	background: var(--background--surface);
	color: var(--color--text--tint-1);
	box-shadow: var(--shadow--outline), var(--shadow--xs);

	&:hover {
		color: var(--color--text--shade-1);
	}
}

.body {
	display: block;
	width: 100%;
	padding: 0 var(--spacing--4xs);
	text-align: left;
}

.open {
	border: 0;
	background: none;
	font: inherit;
	cursor: pointer;

	// Stretches the click target over the media as well.
	&::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: var(--radius--sm);
	}

	&:focus-visible {
		outline: none;

		&::after {
			@include focus.focus-ring;
		}
	}
}

.title {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	overflow: hidden;
	// Every card reserves two lines, so the stack keeps one height as cards cycle through it.
	min-height: calc(2 * var(--line-height--md) * var(--font-size--xs));
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	color: var(--color--text--shade-1);
}
</style>
