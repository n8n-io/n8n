<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { CollapsibleRoot } from 'reka-ui';
import { useI18n } from '@n8n/i18n';
import {
	N8nAnimatedCollapsibleContent,
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nInput,
	N8nRadioGroup,
	N8nRadioGroupItem,
	N8nText,
} from '@n8n/design-system';
import { validateRedirectUri } from '@/features/ai/mcpAccess/redirect-uris.utils';

type UrlMode = 'all' | 'trusted';

interface UrlDraft {
	id: number;
	value: string;
}

const props = defineProps<{
	open: boolean;
	/** Currently persisted allow-list; empty means every callback URL is allowed. */
	uris: string[];
	saving?: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	/** Emits the new allow-list; empty array = allow all. */
	save: [uris: string[]];
}>();

const i18n = useI18n();

const mode = ref<UrlMode>('all');

// Rows carry their own identity: keyed by index, removing a middle row would
// re-key every row below it and defeat the enter/leave transitions.
let nextDraftId = 0;
const createDraft = (value = ''): UrlDraft => ({ id: nextDraftId++, value });

const drafts = ref<UrlDraft[]>([createDraft()]);

function resetFromUris() {
	mode.value = props.uris.length > 0 ? 'trusted' : 'all';
	drafts.value =
		props.uris.length > 0 ? props.uris.map((uri) => createDraft(uri)) : [createDraft()];
}

// Sync when the dialog opens AND whenever the persisted list changes while open:
// the allow-list is loaded async, so a dialog opened before that resolves must
// pick up the loaded value rather than keep the default "All" (which would erase
// an existing trusted list on save). The store only mutates `uris` via load or a
// successful save (which closes the dialog), so this never clobbers live edits.
watch(
	[() => props.open, () => props.uris],
	([open]) => {
		if (!open) return;
		resetFromUris();
	},
	{ immediate: true },
);

const trimmedDrafts = computed(() =>
	drafts.value.map((draft) => draft.value.trim()).filter((uri) => uri.length > 0),
);

const validationError = computed(() => {
	if (mode.value !== 'trusted') return null;
	for (const uri of trimmedDrafts.value) {
		const error = validateRedirectUri(uri);
		if (error) {
			return i18n.baseText(`settings.mcp.allowedRedirectUris.validation.${error}`, {
				interpolate: { url: uri },
			});
		}
	}
	return null;
});

const result = computed(() => (mode.value === 'all' ? [] : trimmedDrafts.value));

const canSave = computed(() => {
	if (validationError.value) return false;
	if (mode.value === 'trusted' && trimmedDrafts.value.length === 0) return false;
	// Saving an unchanged selection (e.g. the default "All") is allowed and
	// idempotent, so the user never has to tweak something just to enable Save.
	return true;
});

const addUrl = () => {
	drafts.value.push(createDraft());
};

const removeUrl = (id: number) => {
	// The list never goes empty. Clearing the last row keeps its identity, so the
	// input just empties instead of leaving and re-entering.
	if (drafts.value.length === 1) {
		drafts.value[0].value = '';
		return;
	}
	drafts.value = drafts.value.filter((draft) => draft.id !== id);
};

const onCancel = () => emit('update:open', false);
const onSave = () => emit('save', result.value);
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		:header="i18n.baseText('settings.mcp.callbackUrls.dialog.title')"
		:description="i18n.baseText('settings.mcp.callbackUrls.dialog.description')"
		data-test-id="mcp-callback-urls-dialog"
		@update:open="emit('update:open', $event)"
	>
		<div :class="$style.body">
			<N8nRadioGroup v-model="mode" orientation="vertical" :class="$style.modes">
				<div
					v-for="option in ['all', 'trusted'] as const"
					:key="option"
					:class="[$style['mode-card'], mode === option && $style['mode-card-active']]"
					:data-test-id="`mcp-callback-urls-mode-${option}`"
					@click="mode = option"
				>
					<N8nRadioGroupItem
						:value="option"
						:label="i18n.baseText(`settings.mcp.callbackUrls.mode.${option}.label`)"
						:description="i18n.baseText(`settings.mcp.callbackUrls.mode.${option}.description`)"
					/>
				</div>
			</N8nRadioGroup>

			<!-- The URL list unfolds with the settings-surface blur motion (the same
			     N8nSettingsRow's expand region uses) so the dialog grows and shrinks
			     with it instead of jumping between the two heights. -->
			<CollapsibleRoot :open="mode === 'trusted'">
				<N8nAnimatedCollapsibleContent
					:class="$style['trusted-content']"
					blur
					data-test-id="mcp-callback-urls-trusted"
				>
					<div :class="$style.trusted">
						<N8nText size="small" color="text-dark" bold :class="$style['trusted-label']">
							{{ i18n.baseText('settings.mcp.callbackUrls.trusted.label') }}
						</N8nText>
						<!-- Rows grow in and shrink out with the same motion as the section, so
						     adding or removing a URL never snaps the dialog to a new height. -->
						<TransitionGroup
							tag="div"
							:class="$style['url-list']"
							:enter-from-class="$style['slot-collapsed']"
							:enter-active-class="$style['slot-animating']"
							:leave-active-class="$style['slot-animating']"
							:leave-to-class="$style['slot-collapsed']"
						>
							<div
								v-for="draft in drafts"
								:key="draft.id"
								:class="$style.slot"
								data-test-id="mcp-callback-url-row"
							>
								<div :class="$style['slot-clip']">
									<div :class="$style['url-row']">
										<N8nInput
											v-model="draft.value"
											type="text"
											:placeholder="i18n.baseText('settings.mcp.callbackUrls.trusted.placeholder')"
											data-test-id="mcp-callback-url-input"
										/>
										<N8nButton
											v-if="drafts.length > 1 || draft.value.length > 0"
											variant="ghost"
											size="small"
											iconOnly
											icon="x"
											:aria-label="i18n.baseText('generic.delete')"
											data-test-id="mcp-callback-url-remove"
											@click="removeUrl(draft.id)"
										/>
									</div>
								</div>
							</div>
						</TransitionGroup>
						<Transition
							:enter-from-class="$style['slot-collapsed']"
							:enter-active-class="$style['slot-animating']"
							:leave-active-class="$style['slot-animating']"
							:leave-to-class="$style['slot-collapsed']"
						>
							<div v-if="validationError" :class="$style.slot">
								<div :class="$style['slot-clip']">
									<N8nText
										size="small"
										color="danger"
										:class="$style.error"
										data-test-id="mcp-callback-urls-error"
									>
										{{ validationError }}
									</N8nText>
								</div>
							</div>
						</Transition>
						<div>
							<N8nButton
								variant="outline"
								size="small"
								icon="plus"
								:label="i18n.baseText('settings.mcp.callbackUrls.trusted.addUrl')"
								data-test-id="mcp-callback-url-add"
								@click="addUrl"
							/>
						</div>
					</div>
				</N8nAnimatedCollapsibleContent>
			</CollapsibleRoot>
		</div>

		<N8nDialogFooter>
			<N8nButton variant="outline" :label="i18n.baseText('generic.cancel')" @click="onCancel" />
			<N8nButton
				variant="solid"
				:label="i18n.baseText('settings.mcp.callbackUrls.dialog.save')"
				:disabled="!canSave"
				:loading="saving"
				data-test-id="mcp-callback-urls-save"
				@click="onSave"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

// The settings-surface blur motion, shared with N8nSettingsRow's expand region
// and the collapsible section above, so the rows and the section move as one.
$slot-duration: motion.$blur-motion-duration;
$slot-easing: motion.$blur-motion-easing;

/* No flex gap here: the collapsible root stays in the flow while closed, so a
   gap would leave a blank band under the cards and snap shut a frame after the
   slide-up ends. The section's own top padding travels with the animated height. */
.body {
	display: flex;
	flex-direction: column;
	margin-block: var(--spacing--xs);
}

.modes {
	display: grid;
	grid-template-columns: 1fr;
	gap: var(--spacing--xs);
}

.mode-card {
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	cursor: pointer;
}

.mode-card-active {
	border-color: var(--color--primary);
}

/* The collapsible clips its overflow while it animates, which would cut the
   inputs' focus ring at the dialog edges. Widen the clip box past the ring and
   pull the content back in with matching padding. */
.trusted-content {
	margin-inline: calc(-1 * var(--spacing--3xs));
	padding-inline: var(--spacing--3xs);
}

/* No gap between the children either: every animated slot carries its own
   spacing inside the animated height (see .url-row / .error), so a row's gap
   shrinks away with the row instead of snapping shut when it unmounts. */
.trusted {
	display: flex;
	flex-direction: column;
	padding-block-start: var(--spacing--sm);
}

.trusted-label {
	margin-block-end: var(--spacing--2xs);
}

.url-list {
	display: flex;
	flex-direction: column;
}

/* A slot animates its real height with the grid 0fr→1fr technique (no
   `height: auto` to interpolate), paired with the opacity fade and subtle blur
   of the settings-surface motion. Identical to N8nSettingsRow's expand region. */
.slot {
	display: grid;
	grid-template-rows: 1fr;
	opacity: 1;
	/* `none`, not `blur(0)`: a non-none filter would keep a stacking context
	 * active on every settled row. `blur(4px) → none` still animates. */
	filter: none;
}

.slot-collapsed {
	grid-template-rows: 0fr;
	opacity: 0;
	filter: blur(4px);
}

.slot-animating {
	transition:
		grid-template-rows $slot-duration $slot-easing,
		opacity $slot-duration $slot-easing,
		filter $slot-duration $slot-easing;
}

/* `min-height: 0` lets the grid track shrink below the content. Clipping only
   applies while a slot animates: at rest the inputs' focus ring must not be cut,
   and while animating the clip box is widened past the ring, matching the
   section's own treatment. */
.slot-clip {
	min-height: 0;
	margin-inline: calc(-1 * var(--spacing--3xs));
	padding-inline: var(--spacing--3xs);
}

.slot-animating .slot-clip {
	overflow: hidden;
}

.url-row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-block-end: var(--spacing--2xs);
}

.error {
	display: block;
	padding-block-end: var(--spacing--2xs);
}

@media (prefers-reduced-motion: reduce) {
	/* Drop the blur and the height animation; keep only a simple, quick fade. */
	.slot-collapsed {
		filter: none;
	}

	.slot-animating {
		transition: opacity $slot-duration linear;
	}
}
</style>
