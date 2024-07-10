<script setup lang="ts">
import AssistantIcon from '../N8nAskAssistantButton/AssistantIcon.vue';
import AssistantText from '../N8nAskAssistantButton/AssistantText.vue';
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<div>
				<AssistantIcon :size="18" :class="$style.icon" />
				<AssistantText
					:class="$style.name"
					font-size="14px"
					line-height="18px"
					text="AI Assistant"
				/>
				<div :class="$style.beta">beta</div>
			</div>
			<div :class="$style.back">
				<n8n-icon icon="arrow-right" color="text-base" />
			</div>
		</div>
		<div :class="$style.body">
			<div :class="$style.greeting">Hi Max 👋</div>
			<div :class="$style.info">
				<p>I'm here to assist you with building workflows.</p>
				<p>
					Whenever you encounter a task that I can help with, you'll see the
					<n8n-ask-assistant-button size="small" :static="true" /> button.
				</p>
				<p>Clicking it starts a chat session with me.</p>
			</div>
		</div>
		<!-- <div>
			<div data-test-id="message">
				<div>
					AI Assistant
				</div>
				<div>
					Hi Max! Here is my top solution to fix the error in your Transform data node👇
				</div>
			</div>
		</div> -->
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
.name {
	margin-right: 6px;
}

.body {
	background-color: var(--color-background-light);
	padding: 16px;
	border: var(--border-base);
	border-top: 0; // todo
	height: 100%;
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

.icon {
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
