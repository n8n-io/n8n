<script setup lang="ts">
import { ref, toRef, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { defaultKeymap, history } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { EditorView, lineNumbers, keymap } from '@codemirror/view';
import { useI18n } from '@n8n/i18n';
import { N8nIconButton, N8nTooltip } from '@n8n/design-system';

import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants';
import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';
import { useCodeMirrorEditor } from '../composables/useCodeMirrorEditor';
import { configToDoc, setSlice } from '../utils/agentSectionEditor.utils';
import type { AgentJsonConfig } from '../types';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		sectionPath?: string | null;
		/**
		 * Alternative to `sectionPath` — render an object containing only these
		 * top-level keys from `config`. Used for composite views like the Agent
		 * tab's raw mode, which should expose only name/model/credential/instructions
		 * rather than the full blob.
		 */
		pickKeys?: string[] | null;
		readOnly?: boolean;
		/**
		 * When another control (e.g. the Raw toggle) sits at the editor's top-right
		 * corner, shift the copy button further left to avoid the collision.
		 */
		offsetCopyForToggle?: boolean;
	}>(),
	{ readOnly: false, sectionPath: null, pickKeys: null, offsetCopyForToggle: false },
);

const emit = defineEmits<{ 'update:config': [config: AgentJsonConfig] }>();

const i18n = useI18n();
const container = ref<HTMLDivElement>();
const parseError = ref('');
const copied = ref(false);
let copiedResetTimer: ReturnType<typeof setTimeout> | null = null;

async function copyContent() {
	const text = editor.getView()?.state.doc.toString() ?? '';
	if (!text) return;
	try {
		await navigator.clipboard.writeText(text);
		copied.value = true;
		if (copiedResetTimer) clearTimeout(copiedResetTimer);
		copiedResetTimer = setTimeout(() => {
			copied.value = false;
			copiedResetTimer = null;
		}, 1500);
	} catch {
		// Clipboard API can reject in insecure contexts or when the tab is not
		// focused. Silent failure is fine — the user will just not see the
		// "Copied" feedback.
	}
}

function tryParse(text: string): { ok: true; value: unknown } | { ok: false } {
	try {
		return { ok: true, value: JSON.parse(text) as unknown };
	} catch {
		return { ok: false };
	}
}

const debouncedSave = useDebounceFn((text: string) => {
	const result = tryParse(text);
	if (!result.ok) {
		parseError.value = i18n.baseText('agents.builder.editor.invalidJson');
		return;
	}
	parseError.value = '';
	// Pick-keys mode: merge the edited subset back into the full config.
	// Only the declared keys propagate — without this, a user adding a stray
	// top-level field in the JSON editor would silently write it onto the
	// agent config alongside the slice they're meant to be editing.
	if (props.pickKeys && props.pickKeys.length > 0) {
		if (!props.config) return;
		if (typeof result.value !== 'object' || result.value === null || Array.isArray(result.value)) {
			return;
		}
		const allowed = new Set<string>(props.pickKeys);
		const filtered: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(result.value as Record<string, unknown>)) {
			if (allowed.has(key)) filtered[key] = value;
		}
		const merged = {
			...(props.config as unknown as Record<string, unknown>),
			...filtered,
		};
		emit('update:config', merged as unknown as AgentJsonConfig);
		return;
	}
	if (!props.sectionPath) {
		emit('update:config', result.value as AgentJsonConfig);
		return;
	}
	if (!props.config) return;
	emit('update:config', setSlice(props.config, props.sectionPath, result.value));
}, getDebounceTime(DEBOUNCE_TIME.API.RESOURCE_SEARCH));

const editor = useCodeMirrorEditor({
	container,
	initialDoc: configToDoc(props.config, props.sectionPath, props.pickKeys),
	readOnly: toRef(props, 'readOnly'),
	extensions: [
		json(),
		lineNumbers(),
		EditorView.lineWrapping,
		history(),
		keymap.of(defaultKeymap),
		codeEditorTheme({ isReadOnly: props.readOnly, maxHeight: '100%' }),
	],
	onChange: (next) => {
		parseError.value = '';
		void debouncedSave(next);
	},
});

function replaceDoc(nextDoc: string) {
	editor.replaceDoc(nextDoc);
	parseError.value = '';
}

watch(
	() => props.config,
	(next) => {
		const view = editor.getView();
		if (!view) return;
		// Don't stomp on the user's in-progress edit while they're typing.
		if (view.hasFocus) return;
		replaceDoc(configToDoc(next, props.sectionPath, props.pickKeys));
	},
	{ deep: true },
);

watch([() => props.sectionPath, () => props.pickKeys], () => {
	if (!editor.getView()) return;
	// Section switches are always authoritative — replace even if focused.
	replaceDoc(configToDoc(props.config, props.sectionPath, props.pickKeys));
});
</script>

<template>
	<div :class="$style.wrapper" data-testid="agent-section-editor">
		<div :class="$style.buttonWrapper">
			<N8nTooltip content="Copy to clipboard">
				<slot>
					<N8nIconButton
						:icon="copied ? 'check' : 'copy'"
						variant="subtle"
						size="xmini"
						:class="$style.copyBtn"
						:title="
							copied
								? i18n.baseText('agents.builder.editor.copied')
								: i18n.baseText('agents.builder.editor.copy')
						"
						:aria-label="
							copied
								? i18n.baseText('agents.builder.editor.copied')
								: i18n.baseText('agents.builder.editor.copy')
						"
						data-testid="agent-section-copy"
						@click="copyContent"
					/>
				</slot>
			</N8nTooltip>
		</div>
		<div ref="container" :class="$style.editor"></div>
		<div v-if="parseError" :class="$style.error">{{ parseError }}</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	position: relative;
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	border: var(--border);
	border-radius: var(--radius);
	overflow: hidden;

	&:hover .buttonWrapper {
		opacity: 1;
		transition: opacity 0.2s;
	}
}

/* N8nIconButton owns the chrome — only override positioning so the button
   floats at the editor's top-right corner. */
.buttonWrapper {
	position: absolute;
	top: var(--spacing--xs);
	right: var(--spacing--xs);
	z-index: 1;
	opacity: 0;
	transition: opacity 0.2s;
}

.editor {
	flex: 1;
	min-height: 0;
	/* CodeMirror handles its own internal scroll via `.cm-scroller`. If the
	   outer wrapper scrolls too, cm's height math breaks and nothing scrolls
	   because content sits at the scroll-top of both containers. */
	overflow: hidden;
}

/* Kill the CodeMirror theme's own border — the editor column already owns the
   surrounding borders, so the editor's border only stacks with them. */
.editor :global(.cm-editor) {
	border: none;
	border-radius: 0;
	height: 100%;
}

.error {
	padding: var(--spacing--3xs) var(--spacing--2xs);
	color: var(--text-color--danger);
	font-size: var(--font-size--2xs);
	background: var(--background--danger);
	border-top: var(--border);
	border-color: var(--border-color--danger);
}
</style>
