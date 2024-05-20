<template>
	<div>
		<div v-for="(suggestion, index) in suggestions" :key="suggestion.key" :class="$style.container">
			<div v-show="suggestion.userQuestionRelatedToTheCurrentContext">
				<Message
					v-for="initialMessage in initialMessages"
					:key="initialMessage.id"
					:message="initialMessage"
				/>
				<p :class="$style.messageTitle"># {{ suggestion.title }}</p>
				<p :class="$style.messageDescription">{{ suggestion.description }}</p>

				<VueMarkdown
					v-if="suggestion.codeDiff"
					class="chat-message-markdown"
					:source="suggestion.codeDiff"
					:options="markdownOptions"
					:plugins="[linksNewTabPlugin]"
				/>
				<!-- <p v-if="suggestion.codeDiff" :class="$style.messageDescription">

				</p> -->
				<!-- For now render only description -->
				<!-- <ul :class="$style.messageTodos">
				<li v-for="todo in suggestion.todos" :key="todo.title">
					<input :id="'todo-' + index + '-' + todo.title" type="checkbox" />
					<label :for="'todo-' + index + '-' + todo.title">{{ todo.title }}</label>
					<p>{{ todo.description }}</p>
				</li>
			</ul> -->
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import VueMarkdown from 'vue-markdown-render';
import hljs from 'highlight.js/lib/core';
import diff from 'highlight.js/lib/languages/diff';
import markdownLink from 'markdown-it-link-attributes';
import type MarkdownIt from 'markdown-it';

hljs.registerLanguage('diff', diff);

const linksNewTabPlugin = (vueMarkdownItInstance: MarkdownIt) => {
	vueMarkdownItInstance.use(markdownLink, {
		attrs: {
			target: '_blank',
			rel: 'noopener',
		},
	});
};

const markdownOptions = {
	highlight(str: string, lang: string) {
		if (lang && hljs.getLanguage(lang)) {
			console.log('entre a esta meirda');
			try {
				return hljs.highlight(str, { language: lang }).value;
			} catch (e) {
				console.log('entre a esta error', e);
			}
		}

		return ''; // use external default escaping
	},
};

interface SuggestionTodo {
	title: string;
	description: string;
}

interface MessageSuggestion {
	title: string;
	description: string;
	key: string;
	todos: SuggestionTodo[];
}

// const emit = defineEmits<{
// 	(event: 'actionSelected', value: MessageAction): void;
// }>();

defineProps<{
	suggestions: MessageSuggestion[];
}>();

// function onButtonClick(action: MessageAction) {
// 	emit('actionSelected', action);
// }
</script>

<style>
.chat-message-markdown .hljs-deletion {
	color: red;
}

.chat-message-markdown .hljs-addition {
	color: green;
}

.chat-message-markdown .language-diff {
	background-color: #e7e7e7;
}
</style>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}
.sugestions {
	margin-top: 5px;
}

.messageTodos {
	list-style-type: none;
	display: flex;
	flex-direction: column;
	gap: 1rem;
	margin-top: 0.5rem;

	label {
		font-weight: bold;
		margin-left: 0.5rem;
	}
	p {
		margin-top: 0.5rem;
	}
}
.messageTitle {
	font-weight: bold;
}
.actions {
	display: flex;
	flex-direction: column;
	width: 60%;
	gap: 0.5rem;
}
.actionButton {
	display: flex;
	flex-direction: row-reverse;
	justify-content: space-between;
}
</style>
