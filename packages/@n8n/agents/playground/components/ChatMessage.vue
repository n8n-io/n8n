<template>
	<div
		:class="[
			'flex gap-3 px-4',
			showAvatar ? 'py-3' : 'py-1',
			msg.role === 'user' ? 'bg-gray-900/50' : '',
		]"
	>
		<div
			v-if="showAvatar"
			:class="[
				'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
				msg.role === 'user' ? 'bg-blue-600' : 'bg-emerald-600',
			]"
		>
			<svg
				v-if="loading && msg.role === 'assistant'"
				class="w-4 h-4 animate-spin text-white"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
			</svg>
			<template v-else>{{ msg.role === 'user' ? 'U' : 'A' }}</template>
		</div>
		<div v-else class="w-7 shrink-0" />
		<div class="flex-1 min-w-0">
			<div v-if="msg.files?.length" class="flex gap-2 mb-2 flex-wrap items-start">
				<template v-for="(file, fileIdx) in msg.files" :key="fileIdx">
					<img
						v-if="file.type.startsWith('image/')"
						:src="`data:${file.type};base64,${file.data}`"
						:alt="file.name"
						class="max-w-full max-h-64 rounded border border-gray-700 object-contain"
					/>
					<div
						v-else
						class="flex items-center gap-1.5 px-2 py-1 bg-gray-800 rounded text-xs text-gray-300"
					>
						<span>📎</span>
						<a
							v-if="msg.role === 'assistant'"
							:href="`data:${file.type};base64,${file.data}`"
							:download="file.name"
							class="hover:text-blue-300 underline"
						>
							{{ file.name }}
						</a>
						<span v-else>{{ file.name }}</span>
					</div>
				</template>
			</div>
			<div v-if="msg.content" class="prose prose-invert prose-sm max-w-none" v-html="rendered" />

			<!-- Pending approval card -->
			<div
				v-if="msg.pendingApproval"
				class="mt-2 border border-amber-700/50 bg-amber-950/30 rounded-lg p-3"
			>
				<div class="flex items-center gap-2 text-xs text-amber-300 mb-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-4 h-4"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
					Tool requires approval
				</div>
				<div class="text-sm text-gray-300 mb-1">
					<code class="text-amber-200">{{ msg.pendingApproval.toolName }}</code>
				</div>
				<div v-if="msg.pendingApproval.input" class="text-xs text-gray-400 mb-3 font-mono">
					{{ formatInputSummary(msg.pendingApproval.input) }}
				</div>
				<div class="flex gap-2">
					<button
						class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-medium transition-colors"
						@click="$emit('approve')"
					>
						Approve
					</button>
					<button
						class="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 rounded text-xs font-medium transition-colors"
						@click="$emit('deny')"
					>
						Deny
					</button>
				</div>
			</div>

			<!-- Approval resolved indicator -->
			<div
				v-if="msg.approvalStatus"
				class="mt-1 text-xs"
				:class="msg.approvalStatus === 'approved' ? 'text-emerald-500' : 'text-red-400'"
			>
				{{ msg.approvalStatus === 'approved' ? 'Approved' : 'Denied' }}
			</div>

			<!-- Thinking + Tool calls row (below message content) -->
			<div
				v-if="msg.role === 'assistant' && (msg.thinking || hasToolCalls || msg.usage)"
				class="mt-2 flex gap-3"
			>
				<!-- Thinking toggle -->
				<button
					v-if="msg.thinking"
					class="flex items-center gap-1.5 text-xs transition-colors"
					:class="thinkingExpanded ? 'text-purple-300' : 'text-purple-400 hover:text-purple-200'"
					@click="toggleThinking"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-3.5 h-3.5 transition-transform"
						:class="{ 'rotate-90': thinkingExpanded }"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
							clip-rule="evenodd"
						/>
					</svg>
					Thinking
				</button>

				<!-- Tool calls toggle -->
				<component
					:is="hasToolCalls ? 'button' : 'span'"
					class="flex items-center gap-1.5 text-xs transition-colors"
					:class="
						hasToolCalls
							? toolCallsExpanded
								? 'text-gray-200'
								: 'text-gray-400 hover:text-gray-200'
							: 'text-gray-600 cursor-default'
					"
					@click="hasToolCalls && toggleToolCalls()"
				>
					<svg
						v-if="hasToolCalls"
						xmlns="http://www.w3.org/2000/svg"
						class="w-3.5 h-3.5 transition-transform"
						:class="{ 'rotate-90': toolCallsExpanded }"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
							clip-rule="evenodd"
						/>
					</svg>
					Tool calls ({{ msg.toolCalls?.length ?? 0 }})
				</component>

				<!-- Usage toggle -->
				<button
					v-if="msg.usage"
					class="flex items-center gap-1.5 text-xs transition-colors"
					:class="usageExpanded ? 'text-blue-300' : 'text-blue-400 hover:text-blue-200'"
					@click="toggleUsage"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-3.5 h-3.5 transition-transform"
						:class="{ 'rotate-90': usageExpanded }"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
							clip-rule="evenodd"
						/>
					</svg>
					{{ usageLabel }}
				</button>
			</div>

			<!-- Thinking expanded content (fixed height, scrollable) -->
			<div
				v-if="thinkingExpanded && msg.thinking"
				ref="thinkingContainer"
				class="mt-1.5 pl-3 border-l-2 border-purple-800/50 text-xs text-gray-400 prose prose-invert prose-xs max-w-none overflow-y-auto"
				style="max-height: 15em; scrollbar-width: thin"
				v-html="renderedThinking"
				@scroll="onThinkingScroll"
			/>

			<!-- Tool calls expanded content -->
			<div v-if="toolCallsExpanded && hasToolCalls" class="mt-1.5 space-y-1">
				<div
					v-for="(tc, idx) in msg.toolCalls"
					:key="idx"
					class="flex items-baseline gap-2 text-xs text-gray-400"
				>
					<code class="text-gray-300">{{ tc.tool }}</code>

					<span v-if="tc.input !== undefined" class="truncate text-gray-500">{{
						formatInputSummary(tc.input)
					}}</span>
				</div>
			</div>

			<!-- Usage expanded content -->
			<div v-if="usageExpanded && msg.usage" class="mt-1.5 text-xs text-gray-400 space-y-2">
				<!-- This agent's usage -->
				<div class="space-y-1">
					<div v-if="msg.usage.model" class="flex gap-2">
						<span class="text-gray-500">Model</span>
						<code class="text-gray-300">{{ msg.usage.model }}</code>
					</div>
					<div class="flex gap-4">
						<span>
							<span class="text-gray-500">Input:</span>
							{{ msg.usage.promptTokens.toLocaleString() }}
						</span>
						<span>
							<span class="text-gray-500">Output:</span>
							{{ msg.usage.completionTokens.toLocaleString() }}
						</span>
						<span>
							<span class="text-gray-500">Total:</span>
							{{ msg.usage.totalTokens.toLocaleString() }}
						</span>
					</div>
					<div v-if="msg.usage.cost != null" class="flex gap-2">
						<span class="text-gray-500">Cost</span>
						<span>${{ msg.usage.cost.toFixed(6) }}</span>
					</div>
				</div>

				<!-- Sub-agent breakdown -->
				<div
					v-for="(sub, idx) in msg.usage.subAgentUsage"
					:key="idx"
					class="pl-3 border-l border-gray-700 space-y-1"
				>
					<div class="flex gap-2">
						<span class="text-gray-500">Sub-agent</span>
						<code class="text-gray-300">{{ sub.agent }}</code>
						<code v-if="sub.model" class="text-gray-500">{{ sub.model }}</code>
					</div>
					<div class="flex gap-4">
						<span>
							<span class="text-gray-500">Input:</span>
							{{ sub.usage.promptTokens.toLocaleString() }}
						</span>
						<span>
							<span class="text-gray-500">Output:</span>
							{{ sub.usage.completionTokens.toLocaleString() }}
						</span>
						<span v-if="sub.usage.cost != null">
							<span class="text-gray-500">Cost:</span>
							${{ sub.usage.cost.toFixed(6) }}
						</span>
					</div>
				</div>

				<!-- Total cost (when sub-agents present) -->
				<div
					v-if="msg.usage.totalCost != null && msg.usage.subAgentUsage?.length"
					class="pt-1 border-t border-gray-700 flex gap-2 font-medium"
				>
					<span class="text-gray-500">Total cost</span>
					<span>${{ msg.usage.totalCost.toFixed(6) }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
// Configure marked once at module level (not per component instance) to
// prevent repeatedly mutating the global Marked instance.
import { marked } from 'marked';

const renderer = new marked.Renderer();
const originalHtml = renderer.html.bind(renderer);
renderer.html = ({ text }: { text: string }) => {
	return originalHtml({
		text: text.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
	});
};
marked.use({ renderer });
</script>

<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		msg: {
			role: 'user' | 'assistant';
			content: string;
			thinking?: string;
			files?: Array<{ name: string; type: string; data: string }>;
			usage?: {
				model?: string;
				promptTokens: number;
				completionTokens: number;
				totalTokens: number;
				cost?: number;
				totalCost?: number;
				subAgentUsage?: Array<{
					agent: string;
					model?: string;
					usage: {
						promptTokens: number;
						completionTokens: number;
						totalTokens: number;
						cost?: number;
					};
				}>;
			};
			toolCalls?: Array<{ tool: string; input: unknown; output: unknown }>;
			pendingApproval?: {
				runId: string;
				toolCallId: string;
				toolName: string;
				input: unknown;
				suspendPayload?: unknown;
			};
			approvalStatus?: 'approved' | 'denied';
		};
		showAvatar?: boolean;
		loading?: boolean;
	}>(),
	{ showAvatar: true },
);

defineEmits<{
	approve: [];
	deny: [];
}>();

const toolCallsExpanded = ref(false);
const thinkingExpanded = ref(false);
const usageExpanded = ref(false);
const thinkingContainer = ref<HTMLElement | undefined>();

const hasToolCalls = computed(() => (props.msg.toolCalls?.length ?? 0) > 0);

// Track whether the user has scrolled away from the bottom
const thinkingAutoScroll = ref(true);

function onThinkingScroll() {
	const el = thinkingContainer.value;
	if (!el) return;
	// Consider "at bottom" if within 10px of the end
	thinkingAutoScroll.value = el.scrollHeight - el.scrollTop - el.clientHeight < 10;
}

// Auto-scroll thinking container as content streams in,
// but only if the user hasn't scrolled up manually.
watch(
	() => props.msg.thinking,
	() => {
		if (!thinkingAutoScroll.value) return;
		nextTick(() => {
			const el = thinkingContainer.value;
			if (el) el.scrollTop = el.scrollHeight;
		});
	},
);

function collapseAll() {
	thinkingExpanded.value = false;
	toolCallsExpanded.value = false;
	usageExpanded.value = false;
}

function toggleThinking() {
	const opening = !thinkingExpanded.value;
	collapseAll();
	thinkingExpanded.value = opening;
	if (opening) {
		thinkingAutoScroll.value = true;
		nextTick(() => {
			const el = thinkingContainer.value;
			if (el) el.scrollTop = el.scrollHeight;
		});
	}
}

function toggleToolCalls() {
	const opening = !toolCallsExpanded.value;
	collapseAll();
	toolCallsExpanded.value = opening;
}

function toggleUsage() {
	const opening = !usageExpanded.value;
	collapseAll();
	usageExpanded.value = opening;
}

const usageLabel = computed(() => {
	if (!props.msg.usage) return '';
	const cost = props.msg.usage.totalCost ?? props.msg.usage.cost;
	if (cost != null) return `$${cost.toFixed(4)}`;
	return `${props.msg.usage.totalTokens} tokens`;
});

const renderedThinking = computed(() => {
	if (!props.msg.thinking) return '';
	try {
		return marked.parse(props.msg.thinking, { breaks: true });
	} catch {
		return props.msg.thinking;
	}
});

const rendered = computed(() => {
	try {
		return marked.parse(props.msg.content, { breaks: true });
	} catch {
		return props.msg.content;
	}
});

function formatInputSummary(value: unknown): string {
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}
</script>
