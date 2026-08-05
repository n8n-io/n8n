<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import type { CreateOAuthClientResponseDto, OAuthClientResponseDto } from '@n8n/api-types';
import { MAX_OAUTH_REDIRECT_URIS } from '@n8n/api-types';
import {
	N8nButton,
	N8nCheckbox,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nNotice,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';

import ConnectionParameter from './ConnectionParameter.vue';
import { MCP_DOCS_PAGE_URL } from '../mcp.constants';
import { validateRedirectUri } from '../redirect-uris.utils';

const props = defineProps<{
	open: boolean;
	/** Set to edit an existing manual registration instead of creating one. */
	client?: OAuthClientResponseDto | null;
	/** Set once the registration succeeded, switching the dialog to its result step. */
	createdClient?: CreateOAuthClientResponseDto | null;
	loading?: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	submit: [payload: { name: string; redirectUris: string[]; confidential: boolean }];
	rotateSecret: [client: OAuthClientResponseDto];
}>();

const i18n = useI18n();

const isEdit = computed(() => !!props.client);

const name = ref('');
/** One input per row; blanks are dropped on submit. */
const redirectUris = ref<string[]>(['']);
const confidential = ref(false);
const error = ref('');

const created = computed(() => props.createdClient ?? null);

const canAddRedirectUri = computed(() => redirectUris.value.length < MAX_OAUTH_REDIRECT_URIS);

/** A registration that authenticates with a secret rather than PKCE alone. */
const isConfidentialClient = computed(
	() => !!props.client && props.client.tokenEndpointAuthMethod !== 'none',
);

function reset() {
	error.value = '';
	name.value = props.client?.name ?? '';
	redirectUris.value = props.client ? [...props.client.redirectUris] : [''];
	confidential.value = false;
}

// Reset on open rather than on close, so the values can't flicker while the
// dialog animates away.
watch(
	() => props.open,
	(open) => {
		if (open) reset();
	},
	{ immediate: true },
);

function addRedirectUri() {
	redirectUris.value = [...redirectUris.value, ''];
}

function removeRedirectUri(index: number) {
	redirectUris.value = redirectUris.value.filter((_, i) => i !== index);
	if (redirectUris.value.length === 0) redirectUris.value = [''];
}

function validate(): { name: string; redirectUris: string[]; confidential: boolean } | null {
	const trimmedName = name.value.trim();
	if (!trimmedName) {
		error.value = i18n.baseText('settings.mcp.registerClient.error.nameRequired');
		return null;
	}

	const uris = redirectUris.value.map((uri) => uri.trim()).filter((uri) => uri.length > 0);
	if (uris.length === 0) {
		error.value = i18n.baseText('settings.mcp.registerClient.error.redirectUriRequired');
		return null;
	}

	for (const uri of uris) {
		const problem = validateRedirectUri(uri);
		if (problem) {
			error.value = i18n.baseText(
				`settings.mcp.allowedRedirectUris.validation.${problem}` as BaseTextKey,
				{ interpolate: { url: uri } },
			);
			return null;
		}
	}

	error.value = '';
	return { name: trimmedName, redirectUris: uris, confidential: confidential.value };
}

function onSubmit() {
	const payload = validate();
	if (!payload) return;
	emit('submit', payload);
}
</script>

<template>
	<N8nDialog :open="open" size="large" @update:open="emit('update:open', $event)">
		<div :class="$style.container" data-test-id="mcp-register-client-modal">
			<N8nDialogHeader>
				<N8nDialogTitle>
					{{
						i18n.baseText(
							created
								? 'settings.mcp.registerClient.created.title'
								: isEdit
									? 'settings.mcp.registerClient.edit.title'
									: 'settings.mcp.registerClient.title',
						)
					}}
				</N8nDialogTitle>
				<N8nDialogDescription>
					{{
						i18n.baseText(
							created
								? 'settings.mcp.registerClient.created.description'
								: 'settings.mcp.registerClient.description',
						)
					}}
				</N8nDialogDescription>
			</N8nDialogHeader>

			<!-- The client id is the whole point of the flow, so it gets its own step. -->
			<div v-if="created" :class="$style.form" data-test-id="mcp-register-client-result">
				<div :class="$style.group">
					<ConnectionParameter
						id="manual-client-id"
						:label="i18n.baseText('settings.mcp.registerClient.created.clientId')"
						:value="created.id"
					/>
					<!-- Answers the question the screen raises: every client dialog has a
						secret field, and a public registration has nothing to put in it. -->
					<N8nText v-if="!created.clientSecret" size="small" color="text-light">
						{{ i18n.baseText('settings.mcp.registerClient.created.noSecret') }}
					</N8nText>
				</div>
				<div v-if="created.clientSecret" :class="$style.group">
					<ConnectionParameter
						id="manual-client-secret"
						:label="i18n.baseText('settings.mcp.registerClient.created.clientSecret')"
						:value="created.clientSecret"
					/>
					<N8nNotice
						:class="$style.notice"
						theme="warning"
						:content="i18n.baseText('settings.mcp.registerClient.created.secretOnce')"
					/>
				</div>
			</div>

			<div v-else :class="$style.form">
				<div>
					<N8nInputLabel
						:label="i18n.baseText('settings.mcp.registerClient.name')"
						:bold="false"
						size="small"
						class="mb-3xs"
					/>
					<N8nInput
						v-model="name"
						size="medium"
						:placeholder="i18n.baseText('settings.mcp.registerClient.name.placeholder')"
						data-test-id="mcp-register-client-name"
					/>
				</div>

				<div>
					<N8nInputLabel
						:label="i18n.baseText('settings.mcp.registerClient.redirectUris')"
						:bold="false"
						size="small"
						class="mb-3xs"
					/>
					<div :class="$style['uri-list']">
						<div v-for="(_, index) in redirectUris" :key="index" :class="$style['uri-row']">
							<N8nInput
								v-model="redirectUris[index]"
								size="medium"
								:placeholder="i18n.baseText('settings.mcp.registerClient.redirectUris.placeholder')"
								:data-test-id="`mcp-register-client-redirect-uri-${index}`"
							/>
							<N8nButton
								v-if="redirectUris.length > 1"
								variant="subtle"
								size="medium"
								iconOnly
								icon="trash-2"
								:data-test-id="`mcp-register-client-remove-redirect-uri-${index}`"
								@click="removeRedirectUri(index)"
							/>
						</div>
					</div>
					<N8nLink
						v-if="canAddRedirectUri"
						:class="$style['add-uri']"
						size="small"
						data-test-id="mcp-register-client-add-redirect-uri"
						@click="addRedirectUri"
					>
						<N8nIcon icon="plus" size="xsmall" />
						{{ i18n.baseText('settings.mcp.registerClient.redirectUris.add') }}
					</N8nLink>
					<N8nText size="small" color="text-light" :class="$style.hint">
						{{ i18n.baseText('settings.mcp.registerClient.redirectUris.hint') }}
						<N8nLink
							:href="MCP_DOCS_PAGE_URL"
							target="_blank"
							rel="noopener noreferrer"
							size="small"
						>
							{{ i18n.baseText('generic.learnMore') }}
						</N8nLink>
					</N8nText>
				</div>

				<div v-if="!isEdit" :class="$style.group">
					<N8nCheckbox
						v-model="confidential"
						:label="i18n.baseText('settings.mcp.registerClient.confidential')"
						data-test-id="mcp-register-client-confidential"
					/>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.mcp.registerClient.confidential.hint') }}
					</N8nText>
				</div>

				<div v-if="isConfidentialClient" :class="$style.group">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.mcp.registerClient.rotateSecret.hint') }}
					</N8nText>
					<N8nButton
						variant="outline"
						size="small"
						:class="$style['rotate-button']"
						data-test-id="mcp-register-client-rotate-secret"
						@click="props.client && emit('rotateSecret', props.client)"
					>
						{{ i18n.baseText('settings.mcp.registerClient.rotateSecret') }}
					</N8nButton>
				</div>

				<N8nText v-if="error" color="danger" size="small" data-test-id="mcp-register-client-error">
					{{ error }}
				</N8nText>
			</div>

			<N8nDialogFooter>
				<template v-if="created">
					<N8nButton
						variant="solid"
						data-test-id="mcp-register-client-done"
						@click="emit('update:open', false)"
					>
						{{ i18n.baseText('settings.mcp.registerClient.created.done') }}
					</N8nButton>
				</template>
				<template v-else>
					<N8nButton
						variant="subtle"
						data-test-id="mcp-register-client-cancel"
						@click="emit('update:open', false)"
					>
						{{ i18n.baseText('generic.cancel') }}
					</N8nButton>
					<N8nButton
						variant="solid"
						:loading="props.loading"
						data-test-id="mcp-register-client-submit"
						@click="onSubmit"
					>
						{{
							i18n.baseText(
								isEdit
									? 'settings.mcp.registerClient.edit.submit'
									: 'settings.mcp.registerClient.submit',
							)
						}}
					</N8nButton>
				</template>
			</N8nDialogFooter>
		</div>
	</N8nDialog>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	max-height: 60vh;
	overflow-y: auto;
}

/* a field with its own caption reads as one block, tighter than the dialog gap */
.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

/* the notice carries its own vertical margin, which would double the flex gap */
.notice {
	--notice--margin: 0;
}

.rotate-button {
	align-self: flex-start;
}

.uri-list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.uri-row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.add-uri {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	margin-top: var(--spacing--2xs);
}

.hint {
	display: block;
	margin-top: var(--spacing--2xs);
}
</style>
