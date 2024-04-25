<template>
	<div :class="$style.container">
		<div
			v-for="(suggestion, index) in suggestions"
			:key="suggestion.key"
			:class="$style.sugestions"
		>
			<p :class="$style.messageTitle">#{{ index + 1 }} {{ suggestion.title }}</p>
			<p :class="$style.messageDescription">{{ suggestion.description }}</p>
			<!-- For now render only description -->
			<ul :class="$style.messageTodos">
				<li v-for="todo in suggestion.todos" :key="todo.title">
					<input :id="'todo-' + index + '-' + todo.title" type="checkbox" />
					<label :for="'todo-' + index + '-' + todo.title">{{ todo.title }}</label>
					<p>{{ todo.description }}</p>
				</li>
			</ul>
		</div>
	</div>
</template>

<script setup lang="ts">
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

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: 1rem;
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
