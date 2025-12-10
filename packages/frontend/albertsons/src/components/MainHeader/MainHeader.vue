<script setup>
defineProps({
	msg: {
		type: String,
		required: false,
	},
});
</script>

<template>
	<div class="greetings">
		<h1 class="red">Welcome to Albertsons AI Agent Space</h1>
	</div>
</template>

<style scoped>
.red {
	color: #0071ce;
}
h1 {
	font-weight: 500;
	font-size: 2.6rem;
	position: relative;
	top: -1px;
}

h3 {
	font-size: 1.2rem;
}

.greetings h1,
.greetings h3 {
	text-align: center;
}

@media (min-width: 1024px) {
	.greetings h1,
	.greetings h3 {
		text-align: left;
	}
}
</style>
