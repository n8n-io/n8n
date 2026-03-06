<template>
	<div class="h-full flex flex-col">
		<div ref="editorContainer" class="flex-1" />
		<div
			v-if="compiler.error.value"
			class="px-4 py-2 bg-red-950 text-red-300 text-sm font-mono border-t border-red-800 max-h-32 overflow-auto"
		>
			{{ compiler.error.value }}
		</div>
	</div>
</template>

<script setup lang="ts">
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
	getWorker(_: unknown, label: string) {
		if (label === 'typescript' || label === 'javascript') {
			return new tsWorker();
		}
		return new editorWorker();
	},
};

const emit = defineEmits<{
	'compile-status': ['compiling' | 'active' | 'error'];
	'compile-error': [string | undefined];
	'compile-evals': [string[]];
	'update:modelValue': [string];
}>();

const props = defineProps<{ modelValue?: string }>();
const editorContainer = ref<HTMLElement | null>(null);
const compiler = useAgentCompiler();

let editor: monaco.editor.IStandaloneCodeEditor | null = null;

const STARTER_TEMPLATE = `import { Agent, Tool } from '@n8n/agents';
import { z } from 'zod';

const rollD20 = new Tool('roll-d20')
  .description('Roll a D20 dice and return the result')
  .input(z.object({
    count: z.number().default(1).describe('Number of dice to roll'),
  }))
  .handler(async ({ count }) => {
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * 20) + 1);
    const total = rolls.reduce((sum, r) => sum + r, 0);
    return { rolls, total };
  });

const agent = new Agent('dungeon-master')
  .model('anthropic/claude-sonnet-4-5')
  .credential('anthropic')
  .instructions('You are a dramatic dungeon master. When asked to roll dice, use the roll-d20 tool and narrate the result with flair.')
  .tool(rollD20);

export default agent;
`;

watch(
	() => compiler.status.value,
	(s) => {
		if (s !== 'idle') emit('compile-status', s as 'compiling' | 'active' | 'error');
	},
);

watch(
	() => compiler.error.value,
	(err) => {
		emit('compile-error', err ?? undefined);
	},
);

watch(
	() => compiler.evalNames.value,
	(names) => {
		emit('compile-evals', names);
	},
);

onMounted(async () => {
	if (!editorContainer.value) return;

	// Configure TypeScript compiler options
	monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
		target: monaco.languages.typescript.ScriptTarget.ES2022,
		module: monaco.languages.typescript.ModuleKind.ESNext,
		moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
		allowNonTsExtensions: true,
		strict: true,
		noEmit: true,
	});

	// Load real type declarations from actual built files.
	// Both @n8n/agents and zod types are served by the server, so they
	// always stay in sync with the installed packages.
	try {
		const { declaration, zodDeclaration } = await $fetch<{
			declaration: string;
			zodDeclaration: string;
		}>('/api/types');
		monaco.languages.typescript.typescriptDefaults.addExtraLib(
			declaration,
			'file:///n8n-agents.d.ts',
		);
		monaco.languages.typescript.typescriptDefaults.addExtraLib(
			zodDeclaration,
			'file:///node_modules/zod/index.d.ts',
		);
	} catch {
		// Silently fail — editor will work without types
	}

	// Provide types for globals available in the sandbox
	monaco.languages.typescript.typescriptDefaults.addExtraLib(
		`declare const Buffer: {
	from(data: string | ArrayBuffer | Uint8Array, encoding?: string): Buffer;
	alloc(size: number, fill?: number): Buffer;
	isBuffer(obj: unknown): obj is Buffer;
	concat(list: Uint8Array[], totalLength?: number): Buffer;
};
interface Buffer extends Uint8Array {
	toString(encoding?: string): string;
}`,
		'file:///globals.d.ts',
	);

	monaco.editor.defineTheme('n8n-dark', {
		base: 'vs-dark',
		inherit: true,
		rules: [],
		colors: { 'editor.background': '#0a0a0a' },
	});

	const initialCode = props.modelValue || STARTER_TEMPLATE;

	editor = monaco.editor.create(editorContainer.value, {
		value: initialCode,
		language: 'typescript',
		theme: 'n8n-dark',
		minimap: { enabled: false },
		fontSize: 14,
		lineNumbers: 'on',
		scrollBeyondLastLine: false,
		automaticLayout: true,
		tabSize: 2,
		padding: { top: 16 },
	});

	editor.onDidChangeModelContent(() => {
		const value = editor!.getValue();
		emit('update:modelValue', value);
		compiler.compileDebounced(value);
	});

	// Initial compile
	compiler.compile(initialCode);

	// Re-compile when the server restarts (HMR or manual) and loses the in-memory agent.
	// Check on page focus so the user doesn't have to manually reload.
	const onFocus = async () => {
		if (!editor) return;
		try {
			const { active } = await $fetch<{ active: boolean }>('/api/agent/status');
			if (!active) {
				const code = editor.getValue();
				if (code.trim()) compiler.compile(code);
			}
		} catch {
			// Server not reachable yet — will retry on next focus
		}
	};
	window.addEventListener('focus', onFocus);
	onUnmounted(() => window.removeEventListener('focus', onFocus));
});

/** Programmatically set the editor content and compile. */
function setCode(value: string, { compile = true } = {}) {
	if (editor && value !== editor.getValue()) {
		editor.setValue(value);
		if (compile) {
			compiler.compile(value);
		}
	}
}

// When modelValue changes from outside, update the editor
watch(
	() => props.modelValue,
	(newValue) => {
		if (newValue !== undefined) setCode(newValue);
	},
);

defineExpose({ setCode });

onUnmounted(() => {
	editor?.dispose();
});
</script>
