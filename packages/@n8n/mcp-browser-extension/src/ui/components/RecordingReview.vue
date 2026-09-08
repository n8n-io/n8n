<script setup lang="ts">
import { N8nButton } from '@n8n/design-system';
import type {
	BrowserRecordingAction,
	BrowserRecordingNetworkRequest,
	BrowserRecordingScreenshot,
} from '@n8n/api-types';

defineProps<{
	actions: BrowserRecordingAction[];
	screenshots: BrowserRecordingScreenshot[];
	networkRequests: BrowserRecordingNetworkRequest[];
}>();

defineEmits<{
	remove: [actionId: string];
	mask: [actionId: string];
	removeScreenshot: [screenshotId: string];
	removeNetworkRequest: [requestId: string];
}>();

function actionTitle(action: BrowserRecordingAction): string {
	if (action.type === 'navigation') return `Opened ${formatUrl(action.url)}`;
	if (action.type === 'tab_switch') {
		return `Switched to ${action.target?.label ?? formatUrl(action.url)}`;
	}
	if (action.type === 'context_menu') return `Right-clicked ${targetName(action)}`;
	if (action.type === 'key') return `Pressed ${action.value ?? 'a key'} in ${targetName(action)}`;

	const target = targetName(action);
	if (action.type === 'copy') {
		return target === 'page element' ? 'Copied selected text' : `Copied text from ${target}`;
	}
	const verb = {
		click: 'Clicked',
		input: 'Entered text in',
		select: 'Selected an option in',
		submit: 'Submitted',
	}[action.type];
	return `${verb} ${target}`;
}

function targetName(action: BrowserRecordingAction): string {
	const target = action.target;
	if (!target) return 'page element';
	if (target.label) return target.label;
	if (target.name) return target.name.replace(/[-_]+/g, ' ');

	const semanticName: Record<string, string> = {
		a: 'link',
		button: 'button',
		form: 'form',
		input: target.inputType ? `${target.inputType} field` : 'field',
		select: 'dropdown',
		textarea: 'text field',
	};
	return target.role ?? semanticName[target.tag] ?? 'page element';
}

function formatUrl(value: string): string {
	try {
		const url = new URL(value);
		return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
	} catch {
		return value;
	}
}
</script>

<template>
	<div class="recording-review">
		<p class="review-note">
			Review what n8n will send to the AI Assistant. Remove actions or mask values that you don't
			want to share.
		</p>
		<p v-if="actions.length === 0" class="empty">No actions recorded</p>
		<ol v-else class="actions">
			<li v-for="action in actions" :key="action.id" class="action">
				<div class="action-content">
					<strong :title="actionTitle(action)">{{ actionTitle(action) }}</strong>
					<span v-if="action.value" class="value" :title="action.value">{{ action.value }}</span>
					<span class="url" :title="action.url">{{ formatUrl(action.url) }}</span>
				</div>
				<template v-for="screenshot in screenshots" :key="screenshot.id">
					<div v-if="screenshot.actionId === action.id" class="screenshot">
						<img
							:src="`data:${screenshot.mimeType};base64,${screenshot.data}`"
							alt="Captured page after this action"
						/>
						<N8nButton
							variant="ghost"
							size="small"
							@click="$emit('removeScreenshot', screenshot.id)"
						>
							Remove screenshot
						</N8nButton>
					</div>
				</template>
				<ul
					v-if="networkRequests.some((request) => request.actionId === action.id)"
					class="network-requests"
				>
					<li
						v-for="request in networkRequests.filter((item) => item.actionId === action.id)"
						:key="request.id"
						class="network-request"
					>
						<span :title="request.url">
							<strong>{{ request.method }}</strong> {{ request.status }} ·
							{{ formatUrl(request.url) }}
						</span>
						<N8nButton
							variant="ghost"
							size="small"
							@click="$emit('removeNetworkRequest', request.id)"
						>
							Remove
						</N8nButton>
					</li>
				</ul>
				<div class="action-buttons">
					<N8nButton variant="ghost" size="small" @click="$emit('mask', action.id)">
						Mask details
					</N8nButton>
					<N8nButton variant="ghost" size="small" @click="$emit('remove', action.id)">
						Remove
					</N8nButton>
				</div>
			</li>
		</ol>
	</div>
</template>

<style scoped lang="scss">
.review-note,
.empty {
	margin: 0;
	font-size: var(--font-size--xs);
	line-height: var(--line-height--sm);
	color: var(--text-color--subtle);
}

.actions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: var(--spacing--sm) 0 0;
	padding: 0;
	list-style: none;
}

.action {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	border-radius: var(--radius);
	background: var(--background--surface);
}

.action-content {
	display: flex;
	width: 100%;
	min-width: 0;
	flex-direction: column;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--xs);
}

.action-content strong {
	display: -webkit-box;
	overflow: hidden;
	overflow-wrap: anywhere;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
}

.screenshot {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: var(--spacing--2xs);
}

.screenshot img {
	display: block;
	width: 100%;
	max-height: 40vh;
	object-fit: contain;
	background: var(--background--subtle);
	border: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	border-radius: var(--radius);
}

.network-requests {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: var(--spacing--2xs) 0 0;
	border-top: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	list-style: none;
}

.network-request {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	min-width: 0;
	font-size: var(--font-size--2xs);
}

.network-request > span {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.value,
.url {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.value {
	font-family: var(--font-family--monospace);
}

.url {
	color: var(--text-color--subtler);
}

.action-buttons {
	display: flex;
	align-self: flex-end;
}
</style>
