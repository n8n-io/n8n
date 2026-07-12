<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import {
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
const drafts = ref<string[]>(['']);

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		mode.value = props.uris.length > 0 ? 'trusted' : 'all';
		drafts.value = props.uris.length > 0 ? [...props.uris] : [''];
	},
	{ immediate: true },
);

const trimmedDrafts = computed(() =>
	drafts.value.map((uri) => uri.trim()).filter((uri) => uri.length > 0),
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
	return JSON.stringify(result.value) !== JSON.stringify(props.uris);
});

const addUrl = () => {
	drafts.value.push('');
};

const removeUrl = (index: number) => {
	drafts.value.splice(index, 1);
	if (drafts.value.length === 0) drafts.value.push('');
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
			<N8nRadioGroup v-model="mode" orientation="horizontal" :class="$style.modes">
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

			<div v-if="mode === 'trusted'" :class="$style.trusted">
				<N8nText size="small" color="text-dark" bold>
					{{ i18n.baseText('settings.mcp.callbackUrls.trusted.label') }}
				</N8nText>
				<div
					v-for="(_, index) in drafts"
					:key="index"
					:class="$style['url-row']"
					data-test-id="mcp-callback-url-row"
				>
					<N8nInput
						v-model="drafts[index]"
						type="text"
						:placeholder="i18n.baseText('settings.mcp.callbackUrls.trusted.placeholder')"
						data-test-id="mcp-callback-url-input"
					/>
					<N8nButton
						v-if="drafts.length > 1 || drafts[index].length > 0"
						variant="ghost"
						size="small"
						iconOnly
						icon="x"
						:aria-label="i18n.baseText('generic.delete')"
						data-test-id="mcp-callback-url-remove"
						@click="removeUrl(index)"
					/>
				</div>
				<N8nText
					v-if="validationError"
					size="small"
					color="danger"
					data-test-id="mcp-callback-urls-error"
				>
					{{ validationError }}
				</N8nText>
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
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	margin-block: var(--spacing--xs);
}

.modes {
	display: grid;
	grid-template-columns: 1fr 1fr;
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

.trusted {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.url-row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
