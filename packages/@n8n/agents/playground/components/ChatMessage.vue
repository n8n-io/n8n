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
			{{ msg.role === 'user' ? 'U' : 'A' }}
		</div>
		<div v-else class="w-7 shrink-0" />
		<div class="flex-1 min-w-0">
			<div v-if="msg.files?.length" class="flex gap-2 mb-2 flex-wrap">
				<div
					v-for="file in msg.files"
					:key="file.name"
					class="flex items-center gap-1.5 px-2 py-1 bg-gray-800 rounded text-xs text-gray-300"
				>
					<span>📎</span>
					<span>{{ file.name }}</span>
				</div>
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
					<code class="text-amber-200">{{ msg.pendingApproval.tool }}</code>
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

			<!-- Tool calls -->
			<div v-if="msg.toolCalls?.length" class="mt-2">
				<button
					class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
					@click="toolCallsExpanded = !toolCallsExpanded"
				>
					<svg
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
					Tool calls ({{ msg.toolCalls.length }})
				</button>
				<div v-if="toolCallsExpanded" class="mt-1.5 space-y-1">
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
			</div>
			<div v-if="msg.role === 'assistant' && msg.tokens" class="mt-1 text-xs text-gray-500">
				{{ msg.tokens.input + msg.tokens.output }} tokens
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
			files?: Array<{ name: string; type: string; data: string }>;
			tokens?: { input: number; output: number };
			toolCalls?: Array<{ tool: string; input: unknown; output: unknown }>;
			pendingApproval?: {
				runId: string;
				toolCallId: string;
				tool: string;
				input: unknown;
			};
			approvalStatus?: 'approved' | 'denied';
		};
		showAvatar?: boolean;
	}>(),
	{ showAvatar: true },
);

defineEmits<{
	approve: [];
	deny: [];
}>();

const toolCallsExpanded = ref(false);

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
