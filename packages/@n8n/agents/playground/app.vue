<template>
	<div class="h-screen flex flex-col bg-gray-950 text-gray-100">
		<header class="flex items-center justify-between px-4 py-2 border-b border-gray-800">
			<h1 class="text-lg font-semibold">@n8n/agents Playground</h1>
			<div class="flex items-center gap-2 relative">
				<span
					:class="
						agentStatus === 'active'
							? 'bg-green-500'
							: agentStatus === 'error'
								? 'bg-red-500'
								: 'bg-yellow-500'
					"
					class="w-2 h-2 rounded-full"
				/>
				<span
					class="text-sm text-gray-400"
					:class="{ 'cursor-pointer underline decoration-dotted': compileError }"
					@click="compileError && copyError()"
				>
					{{ statusText }}
				</span>
				<div
					v-if="compileError"
					class="absolute top-full right-0 mt-2 w-96 max-h-48 overflow-auto bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-sm font-mono text-red-300 shadow-xl z-50 cursor-pointer"
					@click="copyError()"
				>
					<div class="flex items-start justify-between gap-2">
						<span class="flex-1">{{ compileError }}</span>
						<span class="text-red-500 text-xs shrink-0 mt-0.5">
							{{ copied ? 'Copied!' : 'Click to copy' }}
						</span>
					</div>
				</div>
			</div>
		</header>
		<div class="flex flex-1 overflow-hidden">
			<div class="w-1/2 border-r border-gray-800 flex flex-col">
				<CredentialsPanel />
				<EditorPane
					ref="editorRef"
					class="flex-1 min-h-0"
					v-model="code"
					@compile-status="onCompileStatus"
					@compile-error="onCompileError"
					@compile-evals="onCompileEvals"
				/>
			</div>
			<div class="w-1/2 flex flex-col min-h-0">
				<div class="flex items-center border-b border-gray-800 px-4 py-1.5 gap-2">
					<button
						:class="[
							'px-3 py-1.5 text-sm rounded-md font-medium transition-colors',
							chatMode === 'build'
								? 'bg-violet-600 text-white'
								: 'text-gray-400 hover:text-gray-200',
						]"
						@click="chatMode = 'build'"
					>
						Build
					</button>
					<button
						:class="[
							'px-3 py-1.5 text-sm rounded-md font-medium transition-colors',
							chatMode === 'test' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200',
						]"
						@click="chatMode = 'test'"
					>
						Test
					</button>
					<button
						:class="[
							'px-3 py-1.5 text-sm rounded-md font-medium transition-colors',
							chatMode === 'eval'
								? 'bg-emerald-600 text-white'
								: evalNames.length
									? 'text-gray-400 hover:text-gray-200'
									: 'text-gray-600 cursor-not-allowed',
						]"
						:disabled="!evalNames.length"
						@click="evalNames.length && (chatMode = 'eval')"
					>
						Eval
						<span
							v-if="evalNames.length"
							class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-emerald-800 text-emerald-300"
						>
							{{ evalNames.length }}
						</span>
					</button>
					<div class="flex-1" />
					<button
						class="text-xs text-gray-500 hover:text-gray-300 transition-colors"
						@click="chatPaneRef?.clearMessages()"
					>
						Clear
					</button>
				</div>
				<ChatPane
					v-if="chatMode !== 'eval'"
					ref="chatPaneRef"
					:agent-ready="agentStatus === 'active'"
					:mode="chatMode"
					:editor-code="code"
					@generated="onGenerated"
				/>
				<EvalPanel v-if="chatMode === 'eval'" :eval-names="evalNames" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
const EDITOR_STORAGE_KEY = 'n8n-agents-editor-code';
const code = ref(localStorage.getItem(EDITOR_STORAGE_KEY) ?? '');

watch(code, (val) => localStorage.setItem(EDITOR_STORAGE_KEY, val));
const agentStatus = ref<'idle' | 'compiling' | 'active' | 'error'>('idle');
const compileError = ref<string | undefined>();
const chatMode = ref<'build' | 'test' | 'eval'>('build');
const evalNames = ref<string[]>([]);
const chatPaneRef = ref<InstanceType<typeof ChatPane> | undefined>();
const editorRef = ref<InstanceType<typeof EditorPane> | undefined>();

const statusText = computed(() => {
	switch (agentStatus.value) {
		case 'idle':
			return 'No agent loaded';
		case 'compiling':
			return 'Compiling...';
		case 'active':
			return 'Agent active';
		case 'error':
			return 'Compilation error';
		default:
			return '';
	}
});

const copied = ref(false);

function onCompileStatus(status: 'compiling' | 'active' | 'error') {
	agentStatus.value = status;
	if (status !== 'error') compileError.value = undefined;
}

function onCompileError(error: string | undefined) {
	compileError.value = error;
}

function onCompileEvals(names: string[]) {
	evalNames.value = names;
}

async function copyError() {
	if (!compileError.value) return;
	await navigator.clipboard.writeText(compileError.value);
	copied.value = true;
	setTimeout(() => {
		copied.value = false;
	}, 2000);
}

function onGenerated(generatedCode: string) {
	code.value = generatedCode;
	editorRef.value?.setCode(generatedCode);
}
</script>
