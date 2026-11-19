<script setup lang="ts">
// SPIKE (agent-chat-embed): theme editor for the chat page and embed, with a live preview
// of the real @n8n/agent-chat widget (the bundle this instance serves). Copy is hard-coded.
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nInput,
	N8nInputNumber,
	N8nLink,
	N8nSegmentControl,
	N8nSelect2,
	N8nText,
} from '@n8n/design-system';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { deepCopy } from 'n8n-workflow';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { AppearanceChoice, ChatAppearance, ChatTheme, ColorSet } from './chatAppearance';

const props = defineProps<{
	open: boolean;
	appearance: ChatAppearance;
	themeId: string | null;
	agentName: string;
	scriptUrl: string;
	variant: 'webhook' | 'n8n-chat';
	/** The server's answer to the last Save, e.g. "appearance.logoUrl: Use an http(s) URL". */
	error?: string;
}>();
const emit = defineEmits<{
	'update:open': [open: boolean];
	save: [choice: AppearanceChoice];
}>();
const rootStore = useRootStore();

// Theme choice: n8n's default look, a named instance theme, or this chat's own settings.
const N8N = '__n8n';
const CUSTOM = '__custom';
const themes = ref<ChatTheme[]>([]);
const selected = ref(N8N);
const draft = ref<ChatAppearance>({});
const themeError = ref('');
/** A plain copy of the (reactive) look, so the draft never edits the original. */
const copy = (value: ChatAppearance | undefined): ChatAppearance => deepCopy(value ?? {});
const selectedTheme = computed(() => themes.value.find((theme) => theme.id === selected.value));
const themeItems = computed(() => [
	{ value: N8N, label: 'n8n (default)' },
	...themes.value.map((theme) => ({ value: theme.id, label: theme.name })),
	{ value: CUSTOM, label: 'Custom' },
]);

async function loadThemes() {
	themes.value = await makeRestApiRequest<ChatTheme[]>(
		rootStore.restApiContext,
		'GET',
		'/agent-chat-themes',
	);
}
// The chat's own look is there at once; a referenced theme replaces it once the list has loaded.
draft.value = copy(props.appearance);
selected.value = Object.keys(cleaned(props.appearance)).length ? CUSTOM : N8N;
const themesLoaded = ref(false);
onMounted(async () => {
	await loadThemes();
	themesLoaded.value = true;
	const theme = themes.value.find((entry) => entry.id === props.themeId);
	if (theme) {
		selected.value = theme.id;
		draft.value = copy(theme.appearance);
	}
});
function choose(value: string) {
	themeError.value = '';
	selected.value = value;
	if (value === N8N) draft.value = {};
	else if (value !== CUSTOM) draft.value = copy(selectedTheme.value?.appearance ?? {});
}
// Editing n8n's default look makes it this chat's own ("Custom").
watch(
	draft,
	(value) => {
		if (selected.value === N8N && Object.keys(cleaned(value)).length) selected.value = CUSTOM;
	},
	{ deep: true },
);

async function themeRequest<T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: object) {
	themeError.value = '';
	try {
		return await makeRestApiRequest<T>(
			rootStore.restApiContext,
			method,
			`/agent-chat-themes${path}`,
			body,
		);
	} catch (error) {
		// Owners and admins manage themes; others get 403 here.
		themeError.value = error instanceof Error ? error.message : String(error);
		throw error;
	}
}
const naming = ref<'new' | 'rename' | null>(null);
const themeName = ref('');
function startNaming(kind: 'new' | 'rename') {
	naming.value = kind;
	themeName.value = kind === 'rename' ? (selectedTheme.value?.name ?? '') : '';
}
async function confirmName() {
	const name = themeName.value.trim();
	if (!name) return;
	if (naming.value === 'new') {
		const theme = await themeRequest<ChatTheme>('POST', '', {
			name,
			appearance: cleaned(draft.value),
		});
		await loadThemes();
		selected.value = theme.id;
	} else if (selectedTheme.value) {
		await themeRequest('PATCH', `/${selectedTheme.value.id}`, { name });
		await loadThemes();
	}
	naming.value = null;
}
const confirmingDelete = ref(false);
async function deleteTheme() {
	if (!selectedTheme.value) return;
	await themeRequest('DELETE', `/${selectedTheme.value.id}`);
	confirmingDelete.value = false;
	await loadThemes();
	selected.value = CUSTOM;
}

const COLORS: Array<{ key: keyof ColorSet; label: string }> = [
	{ key: 'primaryColor', label: 'Primary' },
	{ key: 'backgroundColor', label: 'Background' },
	{ key: 'textColor', label: 'Text' },
	{ key: 'agentBubbleColor', label: 'Agent bubble' },
];
const HEX = /^#[0-9a-fA-F]{6}$/;
const SCHEME_TABS = [
	{ label: 'Light', value: 'light' },
	{ label: 'Dark', value: 'dark' },
];
const FONTS = [
	{ label: 'System', value: 'system' },
	{ label: 'Serif', value: 'serif' },
	{ label: 'Mono', value: 'mono' },
	{ label: 'Rounded', value: 'rounded' },
];
const SCHEMES = [
	{ label: 'Light', value: 'light' },
	{ label: 'Dark', value: 'dark' },
	{ label: 'Auto', value: 'auto' },
];
const POSITIONS = [
	{ label: 'Left', value: 'left' },
	{ label: 'Right', value: 'right' },
];
const LAUNCHERS = [
	{ label: '💬', value: 'chat' },
	{ label: '✨', value: 'sparkle' },
	{ label: '?', value: 'help' },
	{ label: 'Logo', value: 'logo' },
];
const PREVIEW_MODES = [
	{ label: 'Embed', value: 'bubble' },
	{ label: 'Hosted page', value: 'fullscreen' },
];
const colorTab = ref<'light' | 'dark'>('light');

function set<K extends keyof ChatAppearance>(key: K, value: ChatAppearance[K]) {
	draft.value = { ...draft.value, [key]: value };
}
function setColor(key: keyof ColorSet, value: string) {
	const scheme = colorTab.value;
	draft.value = { ...draft.value, [scheme]: { ...draft.value[scheme], [key]: value } };
}
function isEmpty(value: unknown) {
	return value === undefined || value === null || String(value).trim() === '';
}
/** Only what the owner set: empty fields and empty colour sets use n8n's defaults. */
function cleaned(appearance: ChatAppearance): ChatAppearance {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(appearance)) {
		if (key === 'light' || key === 'dark') {
			const set = Object.fromEntries(
				Object.entries(value ?? {}).filter(([, color]) => !isEmpty(color)),
			);
			if (Object.keys(set).length) out[key] = set;
		} else if (!isEmpty(value)) out[key] = value;
	}
	return out;
}
/** The preview gets only valid colours, so a half-typed one does not flash. */
function forPreview(appearance: ChatAppearance): ChatAppearance {
	const look = cleaned(appearance);
	for (const scheme of ['light', 'dark'] as const) {
		if (look[scheme])
			look[scheme] = Object.fromEntries(
				Object.entries(look[scheme]).filter(([, color]) => HEX.test(String(color))),
			);
	}
	return look;
}

async function save() {
	const appearance = cleaned(draft.value);
	if (selected.value === N8N) return emit('save', { themeId: null, appearance: {} });
	if (selected.value === CUSTOM) return emit('save', { themeId: null, appearance });
	// A named theme: changes go to the theme, so every chat that uses it follows.
	await themeRequest('PATCH', `/${selected.value}`, { appearance });
	emit('save', { themeId: selected.value, appearance: props.appearance });
}

// Live preview: the instance's own widget bundle, in preview mode (sample messages, no network).
interface WidgetHandle {
	unmount(): void;
	update(appearance: ChatAppearance): void;
}
interface WidgetModule {
	mount(options: Record<string, unknown>): WidgetHandle;
}
const previewMode = ref<'bubble' | 'fullscreen'>('bubble');
const previewScheme = ref<'light' | 'dark'>('light');
const stage = ref<HTMLElement>();
let widget: WidgetHandle | undefined;
let loading: Promise<WidgetModule> | undefined;

function loadWidget(): Promise<WidgetModule> {
	const existing = (window as unknown as { N8nAgentChat?: WidgetModule }).N8nAgentChat;
	if (existing) return Promise.resolve(existing);
	loading ??= new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = props.scriptUrl;
		script.onload = () =>
			resolve((window as unknown as { N8nAgentChat: WidgetModule }).N8nAgentChat);
		script.onerror = reject;
		document.head.appendChild(script);
	});
	return loading;
}
async function mountPreview() {
	widget?.unmount();
	widget = undefined;
	if (!stage.value) return;
	const module = await loadWidget();
	const target = document.createElement('div');
	stage.value.replaceChildren(target);
	widget = module.mount({
		url: '',
		target,
		mode: previewMode.value,
		theme: previewMode.value === 'fullscreen' ? 'n8n' : 'default',
		preview: {
			appearance: forPreview(draft.value),
			agentName: props.agentName,
			variant: props.variant,
			scheme: previewScheme.value,
		},
	});
}
watch([stage, previewMode, previewScheme], async () => await mountPreview());
watch(draft, (value) => widget?.update(forPreview(value)), { deep: true });
onBeforeUnmount(() => widget?.unmount());
</script>

<template>
	<N8nDialog
		:open="open"
		size="cover"
		header="Customize appearance"
		data-testid="appearance-dialog"
		@update:open="(value: boolean) => emit('update:open', value)"
	>
		<N8nDialogBody>
			<div :class="$style.layout">
				<div :class="$style.controls">
					<section :class="$style.group" data-testid="appearance-theme">
						<N8nText tag="h4" size="small" bold>Theme</N8nText>
						<N8nSelect2
							:model-value="selected"
							:items="themeItems"
							:disabled="!themesLoaded && !!themeId"
							size="small"
							data-testid="appearance-theme-select"
							@update:model-value="(value) => choose(String(value))"
						/>
						<N8nText v-if="selectedTheme" size="xsmall" color="text-light">
							Changes apply to every chat that uses this theme (now
							{{ selectedTheme.usedBy }}).
						</N8nText>
						<div v-if="naming" :class="$style.inline">
							<N8nInput
								v-model="themeName"
								size="small"
								placeholder="Theme name"
								data-testid="appearance-theme-name"
								@keydown.enter.prevent="confirmName"
							/>
							<N8nButton
								size="small"
								data-testid="appearance-theme-name-save"
								@click="confirmName"
								>{{ naming === 'new' ? 'Create' : 'Rename' }}</N8nButton
							>
							<N8nLink size="small" @click="naming = null">Cancel</N8nLink>
						</div>
						<div v-else :class="$style.inline">
							<N8nLink size="small" data-testid="appearance-theme-new" @click="startNaming('new')"
								>Save as theme…</N8nLink
							>
							<template v-if="selectedTheme">
								<N8nLink
									size="small"
									data-testid="appearance-theme-rename"
									@click="startNaming('rename')"
									>Rename</N8nLink
								>
								<N8nLink
									size="small"
									theme="danger"
									data-testid="appearance-theme-delete"
									@click="confirmingDelete = true"
									>Delete</N8nLink
								>
							</template>
						</div>
						<N8nCallout
							v-if="confirmingDelete && selectedTheme"
							theme="warning"
							data-testid="appearance-theme-delete-confirm"
						>
							Delete “{{ selectedTheme.name }}”? It is used by {{ selectedTheme.usedBy }}
							{{ selectedTheme.usedBy === 1 ? 'chat' : 'chats' }}. They fall back to their own
							settings or the n8n default.
							<template #actions>
								<N8nButton
									size="small"
									variant="destructive"
									data-testid="appearance-theme-delete-yes"
									@click="deleteTheme"
									>Delete</N8nButton
								>
								<N8nButton size="small" variant="ghost" @click="confirmingDelete = false"
									>Keep</N8nButton
								>
							</template>
						</N8nCallout>
						<N8nText
							v-if="themeError"
							size="xsmall"
							color="danger"
							data-testid="appearance-theme-error"
						>
							{{ themeError }}
						</N8nText>
					</section>

					<section :class="$style.group">
						<N8nText tag="h4" size="small" bold>Text</N8nText>
						<label :class="$style.field">
							<N8nText size="small">Title</N8nText>
							<N8nInput
								:model-value="draft.title ?? ''"
								size="small"
								:placeholder="agentName"
								data-testid="appearance-title"
								@update:model-value="(v: string) => set('title', v)"
							/>
						</label>
						<label :class="$style.field">
							<N8nText size="small">Welcome message</N8nText>
							<N8nInput
								:model-value="draft.welcomeMessage ?? ''"
								type="textarea"
								:rows="2"
								size="small"
								placeholder="Hi! How can I help?"
								data-testid="appearance-welcomeMessage"
								@update:model-value="(v: string) => set('welcomeMessage', v)"
							/>
						</label>
						<label :class="$style.field">
							<N8nText size="small">Input placeholder</N8nText>
							<N8nInput
								:model-value="draft.placeholder ?? ''"
								size="small"
								placeholder="Message"
								data-testid="appearance-placeholder"
								@update:model-value="(v: string) => set('placeholder', v)"
							/>
						</label>
					</section>

					<section :class="$style.group">
						<N8nText tag="h4" size="small" bold>Colors</N8nText>
						<N8nSegmentControl
							v-model="colorTab"
							:options="SCHEME_TABS"
							size="small"
							data-testid="appearance-color-tab"
						/>
						<N8nText size="xsmall" color="text-light">
							{{ colorTab === 'light' ? 'Light' : 'Dark' }} scheme. Empty fields use n8n’s colors;
							text follows a custom background.
						</N8nText>
						<div v-for="color in COLORS" :key="color.key" :class="$style.colorRow">
							<N8nText size="small" :class="$style.colorLabel">{{ color.label }}</N8nText>
							<input
								type="color"
								:class="$style.swatch"
								:value="
									HEX.test(draft[colorTab]?.[color.key] ?? '')
										? draft[colorTab]?.[color.key]
										: '#ffffff'
								"
								:aria-label="`${color.label} color`"
								@input="setColor(color.key, ($event.target as HTMLInputElement).value)"
							/>
							<N8nInput
								:model-value="draft[colorTab]?.[color.key] ?? ''"
								size="small"
								placeholder="Default"
								:class="$style.hex"
								:data-testid="`appearance-${color.key}`"
								@update:model-value="(v: string) => setColor(color.key, v.trim())"
							/>
						</div>
					</section>

					<section :class="$style.group">
						<N8nText tag="h4" size="small" bold>Style</N8nText>
						<div :class="$style.field">
							<N8nText size="small">Color scheme</N8nText>
							<N8nSegmentControl
								:model-value="draft.colorScheme ?? 'light'"
								:options="SCHEMES"
								size="small"
								data-testid="appearance-colorScheme"
								@update:model-value="(v) => set('colorScheme', v as ChatAppearance['colorScheme'])"
							/>
							<N8nText size="xsmall" color="text-light">
								Auto follows the visitor’s system setting (light or dark).
							</N8nText>
						</div>
						<div :class="$style.field">
							<N8nText size="small">Font</N8nText>
							<N8nSegmentControl
								:model-value="draft.font ?? 'system'"
								:options="FONTS"
								size="small"
								data-testid="appearance-font"
								@update:model-value="(v) => set('font', v as ChatAppearance['font'])"
							/>
						</div>
						<div :class="$style.field">
							<N8nText size="small">Corner radius (px)</N8nText>
							<N8nInputNumber
								:model-value="draft.radius ?? 12"
								:min="0"
								:max="24"
								size="small"
								data-testid="appearance-radius"
								@update:model-value="(v: number | undefined) => set('radius', v)"
							/>
						</div>
						<label :class="$style.field">
							<N8nText size="small">Logo URL</N8nText>
							<N8nInput
								:model-value="draft.logoUrl ?? ''"
								size="small"
								placeholder="https://example.com/logo.png"
								data-testid="appearance-logoUrl"
								@update:model-value="(v: string) => set('logoUrl', v.trim())"
							/>
						</label>
					</section>

					<section :class="$style.group">
						<N8nText tag="h4" size="small" bold>Embed bubble</N8nText>
						<div :class="$style.field">
							<N8nText size="small">Position</N8nText>
							<N8nSegmentControl
								:model-value="draft.position ?? 'right'"
								:options="POSITIONS"
								size="small"
								data-testid="appearance-position"
								@update:model-value="(v) => set('position', v as ChatAppearance['position'])"
							/>
						</div>
						<div :class="$style.field">
							<N8nText size="small">Launcher icon</N8nText>
							<N8nSegmentControl
								:model-value="draft.launcherIcon ?? 'chat'"
								:options="LAUNCHERS"
								size="small"
								data-testid="appearance-launcherIcon"
								@update:model-value="
									(v) => set('launcherIcon', v as ChatAppearance['launcherIcon'])
								"
							/>
						</div>
					</section>
				</div>

				<div :class="$style.previewColumn">
					<div :class="$style.previewBar">
						<N8nSegmentControl
							v-model="previewMode"
							:options="PREVIEW_MODES"
							size="small"
							data-testid="appearance-preview-mode"
						/>
						<N8nSegmentControl
							v-model="previewScheme"
							:options="SCHEME_TABS"
							size="small"
							data-testid="appearance-preview-scheme"
						/>
					</div>
					<!-- transform: the widget's fixed positioning stays inside this frame. -->
					<div ref="stage" :class="$style.stage" data-testid="appearance-preview" />
					<N8nText size="xsmall" color="text-light">
						Preview with sample messages. Nothing is sent to the agent. Light / Dark shows each
						color set, whatever the color scheme setting is.
					</N8nText>
				</div>
			</div>
			<N8nCallout v-if="error" theme="danger" :class="$style.error" data-testid="appearance-error">
				Not saved. {{ error }}
			</N8nCallout>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="ghost" data-testid="appearance-reset" @click="choose(N8N)">
				Reset to defaults
			</N8nButton>
			<div :class="$style.spacer" />
			<N8nButton variant="outline" @click="emit('update:open', false)">Cancel</N8nButton>
			<N8nButton data-testid="appearance-save" @click="save">Save</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module lang="scss">
.layout {
	display: grid;
	grid-template-columns: minmax(280px, 360px) 1fr;
	gap: var(--spacing--lg);
	min-height: 0;
}

.controls {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	overflow-y: auto;
	max-height: 720px;
	padding-right: var(--spacing--2xs);
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.inline {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.colorRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.colorLabel {
	width: 96px;
	flex-shrink: 0;
}

.swatch {
	width: 28px;
	height: 28px;
	padding: 0;
	border: var(--border);
	border-radius: var(--radius);
	background: none;
	cursor: pointer;
}

.hex {
	flex: 1;
}

.previewColumn {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.previewBar {
	display: flex;
	gap: var(--spacing--xs);
}

.stage {
	position: relative;
	transform: translateZ(0);
	// Tall enough for the open bubble window (600px) plus the launcher.
	height: 720px;
	border: var(--border);
	border-radius: var(--radius--lg);
	// The preview never takes the editor's own theme: the widget sets its colours and scheme.
	color-scheme: normal;
	background: repeating-linear-gradient(
		45deg,
		var(--color--background--light-2),
		var(--color--background--light-2) 12px,
		var(--color--background--light-3) 12px,
		var(--color--background--light-3) 24px
	);
	overflow: hidden;
}

.error {
	margin-top: var(--spacing--sm);
}

.spacer {
	flex: 1;
}
</style>
