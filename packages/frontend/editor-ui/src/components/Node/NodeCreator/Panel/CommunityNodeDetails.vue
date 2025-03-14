<script setup lang="ts">
import { reactive } from 'vue';

export interface Props {}

withDefaults(defineProps<Props>(), {});

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const state = reactive({});

console.log(emit, state);
</script>

<template>
	<div :class="$style.card">
		<div :class="$style.header">
			<div :class="$style.title">
				<img
					src="https://static-production.npmjs.com/attachments/ck3uweazy72ye8874y9kkxnx1-gak.png"
					alt="PDF Icon"
				/>
				PDFKit
			</div>
			<button :class="$style.installbtn">
				<span>Install node</span>
			</button>
		</div>
		<p :class="$style.description">Use this node to convert images to PDF.</p>
		<div :class="$style.separator"></div>
		<div :class="$style.info">
			<div>User</div>
			<div>✔ 1,342 installs</div>
			<div>• Published by oriondesign</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	background: white;
	width: 100%;
	padding: 16px;

	display: flex;
	flex-direction: column;
}
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.title {
	display: flex;
	align-items: center;
	font-size: 18px;
	font-weight: bold;
}
.title img {
	width: 24px;
	height: 24px;
	margin-right: 8px;
}
.installbtn {
	background-color: #ff5a5f;
	color: white;
	border: none;
	padding: 6px 10px;
	border-radius: 5px;
	cursor: pointer;
	font-size: 14px;
	display: flex;
	align-items: center;
	gap: 6px;
}
.installbtn span {
	display: flex;
	align-items: center;
}

.description {
	font-size: 14px;
	color: #666;
	margin: 8px 0;
}
.separator {
	height: 1px;
	background: #e0e0e0;
	margin: 5px 0;
}
.info {
	display: flex;
	align-items: center;
	font-size: 12px;
	color: #666;
	gap: 10px;
	margin-top: 5px;
}
.info div {
	display: flex;
	align-items: center;
	gap: 5px;
}
.info img {
	width: 16px;
	height: 16px;
}
</style>
