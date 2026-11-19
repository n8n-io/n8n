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
	N8nSegmentControl,
	N8nText,
} from '@n8n/design-system';
import { onBeforeUnmount, ref, watch } from 'vue';

import type { ChatAppearance } from './chatAppearance';

const props = defineProps<{
	open: boolean;
	appearance: ChatAppearance;
	agentName: string;
	scriptUrl: string;
	variant: 'webhook' | 'n8n-chat';
	/** The server's answer to the last Save, e.g. "appearance.logoUrl: Use an http(s) URL". */
	error?: string;
}>();
const emit = defineEmits<{
	'update:open': [open: boolean];
	save: [appearance: ChatAppearance];
}>();

const draft = ref<ChatAppearance>({});
watch(
	() => props.open,
	(open) => {
		if (open) draft.value = { ...props.appearance };
	},
	{ immediate: true },
);

const COLORS: Array<{
	key: 'primaryColor' | 'backgroundColor' | 'textColor' | 'agentBubbleColor';
	label: string;
}> = [
	{ key: 'primaryColor', label: 'Primary' },
	{ key: 'backgroundColor', label: 'Background' },
	{ key: 'textColor', label: 'Text' },
	{ key: 'agentBubbleColor', label: 'Agent bubble' },
];
const HEX = /^#[0-9a-fA-F]{6}$/;
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

function set<K extends keyof ChatAppearance>(key: K, value: ChatAppearance[K]) {
	draft.value = { ...draft.value, [key]: value };
}
/** Only what the owner set: empty fields use the widget's defaults. The server checks the rest. */
function cleaned(appearance: ChatAppearance): ChatAppearance {
	return Object.fromEntries(
		Object.entries(appearance).filter(
			([, value]) => value !== undefined && value !== null && String(value).trim() !== '',
		),
	);
}
/** The preview gets only valid colours, so a half-typed one does not flash. */
function forPreview(appearance: ChatAppearance): ChatAppearance {
	return Object.fromEntries(
		Object.entries(cleaned(appearance)).filter(
			([key, value]) => !key.endsWith('Color') || HEX.test(String(value)),
		),
	);
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
	const target = stage.value.appendChild(document.createElement('div'));
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
		},
	});
}
watch([stage, previewMode], async () => await mountPreview());
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
						<N8nText size="xsmall" color="text-light">Empty fields use the default colors.</N8nText>
						<div v-for="color in COLORS" :key="color.key" :class="$style.colorRow">
							<N8nText size="small" :class="$style.colorLabel">{{ color.label }}</N8nText>
							<input
								type="color"
								:class="$style.swatch"
								:value="HEX.test(draft[color.key] ?? '') ? draft[color.key] : '#ffffff'"
								:aria-label="`${color.label} color`"
								@input="set(color.key, ($event.target as HTMLInputElement).value)"
							/>
							<N8nInput
								:model-value="draft[color.key] ?? ''"
								size="small"
								placeholder="Default"
								:class="$style.hex"
								:data-testid="`appearance-${color.key}`"
								@update:model-value="(v: string) => set(color.key, v.trim())"
							/>
						</div>
					</section>

					<section :class="$style.group">
						<N8nText tag="h4" size="small" bold>Style</N8nText>
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
						<div :class="$style.field">
							<N8nText size="small">Color scheme</N8nText>
							<N8nSegmentControl
								:model-value="draft.colorScheme ?? 'light'"
								:options="SCHEMES"
								size="small"
								data-testid="appearance-colorScheme"
								@update:model-value="(v) => set('colorScheme', v as ChatAppearance['colorScheme'])"
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
					<N8nSegmentControl
						v-model="previewMode"
						:options="PREVIEW_MODES"
						size="small"
						data-testid="appearance-preview-mode"
					/>
					<!-- transform: the widget's fixed positioning stays inside this frame. -->
					<div ref="stage" :class="$style.stage" data-testid="appearance-preview" />
					<N8nText size="xsmall" color="text-light">
						Preview with sample messages. Nothing is sent to the agent.
					</N8nText>
				</div>
			</div>
			<N8nCallout v-if="error" theme="danger" :class="$style.error" data-testid="appearance-error">
				Not saved. {{ error }}
			</N8nCallout>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="ghost" data-testid="appearance-reset" @click="draft = {}">
				Reset to defaults
			</N8nButton>
			<div :class="$style.spacer" />
			<N8nButton variant="outline" @click="emit('update:open', false)">Cancel</N8nButton>
			<N8nButton data-testid="appearance-save" @click="emit('save', cleaned(draft))"
				>Save</N8nButton
			>
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

.stage {
	position: relative;
	transform: translateZ(0);
	// Tall enough for the open bubble window (600px) plus the launcher.
	height: 720px;
	border: var(--border);
	border-radius: var(--radius--lg);
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
