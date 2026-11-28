<script setup lang="ts">
import {
	mcpServerSlugFromName,
	MCP_SERVER_NAME_MAX_LENGTH,
	MCP_SERVER_SLUG_MAX_LENGTH,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, useTemplateRef, watch } from 'vue';

import { useMcpServerSlugField } from '../composables/useMcpServerSlugField';
import { useMcpServerUrl } from '../composables/useMcpServerUrl';

const props = defineProps<{
	projectId: string;
	name: string;
	slug: string;
	/** Active (non-blocked) people currently connected to this server. */
	activePeopleCount: number;
	saving?: boolean;
}>();

const emit = defineEmits<{
	rename: [changes: { name?: string; slug?: string }];
}>();

const open = defineModel<boolean>('open', { required: true });
const slugConflict = defineModel<'taken' | 'reserved' | null>('slugConflict', { default: null });

const i18n = useI18n();
const { serverUrl } = useMcpServerUrl();

const nameValue = ref('');
const changeUrl = ref(false);
const nameInput = useTemplateRef<{ focus: () => void; select: () => void }>('nameInput');

const {
	slug,
	slugEdited,
	finalSlug,
	availability,
	slugCheckFailed,
	slugError,
	onSlugInput,
	setConflict,
	reset: resetSlug,
} = useMcpServerSlugField({
	projectId: () => props.projectId,
	enabled: () => open.value && changeUrl.value,
	currentSlug: () => props.slug,
	showEmptyError: () => changeUrl.value,
});

const trimmedName = computed(() => nameValue.value.trim());
const nameChanged = computed(() => trimmedName.value !== props.name);
const slugChanged = computed(() => changeUrl.value && finalSlug.value !== props.slug);

const slugValid = computed(() => {
	if (!changeUrl.value) return true;
	if (finalSlug.value === '') return false;
	if (finalSlug.value === props.slug) return true;
	if (slugConflict.value !== null) return false;
	return availability.value?.available === true || slugCheckFailed.value;
});

const canSubmit = computed(
	() =>
		trimmedName.value !== '' &&
		(nameChanged.value || slugChanged.value) &&
		slugValid.value &&
		!props.saving,
);

watch(
	open,
	(isOpen) => {
		if (!isOpen) return;
		nameValue.value = props.name;
		changeUrl.value = false;
		slugConflict.value = null;
		resetSlug(props.slug);
	},
	{ immediate: true },
);

watch(changeUrl, (enabled) => {
	slugConflict.value = null;
	if (enabled) {
		const initial =
			trimmedName.value !== props.name ? mcpServerSlugFromName(nameValue.value) : props.slug;
		resetSlug(initial);
	} else {
		resetSlug(props.slug);
	}
});

watch(nameValue, (value) => {
	if (changeUrl.value && !slugEdited.value) {
		slug.value = mcpServerSlugFromName(value);
	}
});

watch(slugConflict, (reason) => {
	if (reason) setConflict(reason);
});

watch(finalSlug, () => {
	if (slugConflict.value !== null) slugConflict.value = null;
});

function onOpenAutoFocus(event: Event) {
	event.preventDefault();
	nameInput.value?.focus();
	nameInput.value?.select();
}

function onSubmit() {
	if (!canSubmit.value) return;
	const changes: { name?: string; slug?: string } = {};
	if (nameChanged.value) changes.name = trimmedName.value;
	if (slugChanged.value) changes.slug = finalSlug.value;
	emit('rename', changes);
}
</script>

<template>
	<N8nDialog
		:open="open"
		:header="i18n.baseText('mcpServers.rename.title')"
		:aria-description="i18n.baseText('mcpServers.rename.ariaDescription')"
		size="medium"
		data-test-id="rename-mcp-server-dialog"
		@update:open="(value: boolean) => !saving && (open = value)"
		@open-auto-focus="onOpenAutoFocus"
	>
		<N8nDialogBody :class="$style.form">
			<N8nInputLabel
				:label="i18n.baseText('mcpServers.rename.name')"
				:bold="false"
				size="small"
				input-name="rename-mcp-server-name"
			>
				<N8nInput
					id="rename-mcp-server-name"
					ref="nameInput"
					v-model="nameValue"
					:maxlength="MCP_SERVER_NAME_MAX_LENGTH"
					data-test-id="rename-mcp-server-name"
					@keydown.enter="onSubmit"
				/>
			</N8nInputLabel>

			<N8nCheckbox
				id="rename-mcp-server-change-url"
				v-model="changeUrl"
				:label="i18n.baseText('mcpServers.rename.changeUrl')"
				:disabled="saving"
				:class="$style.checkbox"
				data-test-id="rename-mcp-server-change-url"
			/>

			<template v-if="changeUrl">
				<N8nInputLabel
					:label="i18n.baseText('mcpServers.create.url')"
					:bold="false"
					size="small"
					input-name="rename-mcp-server-slug"
					:class="$style.field"
				>
					<N8nInput
						id="rename-mcp-server-slug"
						:model-value="slug"
						:placeholder="i18n.baseText('mcpServers.create.url.placeholder')"
						:maxlength="MCP_SERVER_SLUG_MAX_LENGTH"
						data-test-id="rename-mcp-server-slug"
						@update:model-value="onSlugInput"
						@keydown.enter="onSubmit"
					/>
				</N8nInputLabel>
				<code :class="$style.url" data-test-id="rename-mcp-server-url">
					{{ serverUrl(finalSlug || i18n.baseText('mcpServers.create.url.placeholder')) }}
				</code>
				<N8nText
					v-if="slugError"
					size="small"
					color="danger"
					:class="$style.helper"
					data-test-id="rename-mcp-server-slug-error"
				>
					{{ slugError }}
				</N8nText>
				<N8nText
					v-else-if="slugCheckFailed"
					size="small"
					color="text-light"
					:class="$style.helper"
					data-test-id="rename-mcp-server-slug-unchecked"
				>
					{{ i18n.baseText('mcpServers.rename.url.checkFailed') }}
				</N8nText>
				<N8nText v-else size="small" color="text-light" :class="$style.helper">
					{{ i18n.baseText('mcpServers.rename.url.hint') }}
				</N8nText>

				<N8nCallout
					v-if="activePeopleCount > 0"
					theme="warning"
					:class="$style.warning"
					data-test-id="rename-mcp-server-connections-warning"
				>
					{{
						i18n.baseText('mcpServers.rename.url.warning', {
							adjustToNumber: activePeopleCount,
							interpolate: { count: String(activePeopleCount) },
						})
					}}
				</N8nCallout>
			</template>
			<N8nText v-else size="small" color="text-light" tag="p" :class="$style.helper">
				{{
					i18n.baseText('mcpServers.rename.urlHint', {
						interpolate: { url: serverUrl(props.slug) },
					})
				}}
			</N8nText>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="ghost"
				:label="i18n.baseText('generic.cancel')"
				:disabled="saving"
				@click="open = false"
			/>
			<N8nButton
				variant="solid"
				:label="i18n.baseText('mcpServers.rename.submit')"
				:disabled="!canSubmit"
				:loading="saving"
				data-test-id="rename-mcp-server-submit"
				@click="onSubmit"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
}

.checkbox {
	margin-top: var(--spacing--sm);
}

.field {
	margin-top: var(--spacing--sm);
}

.url {
	margin-top: var(--spacing--4xs);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
	word-break: break-all;
}

.helper {
	margin-top: var(--spacing--4xs);
	word-break: break-all;
}

.warning {
	margin-top: var(--spacing--sm);
}
</style>
