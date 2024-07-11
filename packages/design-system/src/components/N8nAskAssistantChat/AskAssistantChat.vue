<script setup lang="ts">
import AssistantIcon from '../N8nAskAssistantButton/AssistantIcon.vue';
import AssistantText from '../N8nAskAssistantButton/AssistantText.vue';
import AssistantAvatar from './AssistantAvatar.vue';
import CodeDiff from './CodeDiff.vue';
import type { AssistantMessage } from './types';

import Markdown from 'markdown-it';

const md = new Markdown({
	breaks: true,
});

interface Props {
	user: {
		firstName: string;
		lastName: string;
	};
	messages?: AssistantMessage[];
}

const props = defineProps<Props>();
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<div :class="$style.chatTitle">
				<AssistantIcon :size="18" />
				<AssistantText font-size="14px" line-height="18px" text="AI Assistant" />
				<div :class="$style.beta">beta</div>
			</div>
			<div :class="$style.back">
				<n8n-icon icon="arrow-right" color="text-base" />
			</div>
		</div>
		<div :class="$style.body">
			<div v-if="messages?.length" :class="$style.messages">
				<div v-for="(message, i) in props.messages" :key="i" :class="$style.message">
					<div v-if="i === 0 || message.role !== messages[i - 1].role" :class="$style.roleName">
						<AssistantAvatar v-if="message.role === 'assistant'" />
						<n8n-avatar
							v-else
							:first-name="user.firstName"
							:last-name="user.lastName"
							size="xsmall"
						/>

						<span v-if="message.role === 'assistant'">AI Assistant</span>
						<span v-else>You</span>
					</div>
					<div v-if="message.type === 'text' && message.title">
						<div>{{ message.title }}</div>
						<div>{{ message.content }}</div>
					</div>
					<div v-else-if="message.type === 'text'">
						<span v-if="message.role === 'user'">{{ message.content }}</span>
						<!-- eslint-disable-next-line vue/no-v-html -->
						<span v-else v-html="md.render(message.content)"></span>
					</div>
					<div v-else-if="message.type === 'code-diff'">
						<CodeDiff :title="message.description" :content="message.codeDiff" />
					</div>
					<div v-else-if="message.type === 'quick-replies'">
						<div>Quick reply 👇</div>
						<div v-for="opt in message.options" :key="opt.type">
							<button>
								{{ opt.label }}
							</button>
						</div>
					</div>
				</div>
			</div>

			<div v-else :class="$style.placeholder">
				<div :class="$style.greeting">Hi {{ props.user.firstName }} 👋</div>
				<div :class="$style.info">
					<p>I'm here to assist you with building workflows.</p>
					<p>
						Whenever you encounter a task that I can help with, you'll see the
						<n8n-ask-assistant-button size="small" :static="true" /> button.
					</p>
					<p>Clicking it starts a chat session with me.</p>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
}

.header {
	padding: 23px 23px;
	background-color: var(--color-background-xlight);
	border: var(--border-base);
	// todo
	border-top: 0;
	display: flex;

	div {
		display: flex;
		align-items: center;
	}

	> div:first-of-type {
		width: 100%;
	}
}

.body {
	background-color: var(--color-background-light);
	border: var(--border-base);
	border-top: 0; // todo
	height: 100%;
}

.placeholder {
	padding: 16px;
}

.messages {
	padding: 12px;
}

.message {
	margin-bottom: 12px;
	font-size: 12px;
	line-height: 19px;
}

.beta {
	display: inline-block;

	color: var(--color-secondary);
	font-size: 10px;
	font-weight: 600;
	line-height: 10px; /* 100% */
	background-color: var(--color-foreground-light);
	padding: 1px 4px 2px 4px;
	border-radius: 16px;
}

.roleName {
	display: flex;
	align-items: center;
	margin-bottom: 6px;

	font-weight: 600;
	font-size: 12px;

	> * {
		margin-right: 6px;
	}
}

.chatTitle > * {
	margin-right: var(--spacing-xs);
}

.greeting {
	color: var(--color-text-dark);
	font-size: var(--font-size-m);
	line-height: 24px;
	margin-bottom: 16px;
}

.info {
	font-size: var(--font-size-s);
	color: var(--color-text-base);
}

.back:hover {
	cursor: pointer;
}
</style>
