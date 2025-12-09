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
		<h1 class="green">My sidebar here</h1>
	</div>
</template>

<style scoped>
.green {
	color: #0f0;
}
h1 {
	font-weight: 500;
	font-size: 2.6rem;
	position: relative;
	top: -10px;
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
