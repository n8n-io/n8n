<template>
	<div>
		<input
			ref="fileInput"
			type="file"
			multiple
			accept="image/*,.pdf,.csv,.txt,.json,.md"
			class="hidden"
			@change="onFileSelect"
		/>
		<button
			class="p-2 text-gray-400 hover:text-gray-200 transition-colors"
			title="Attach files"
			@click="fileInput?.click()"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="w-5 h-5"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
					clip-rule="evenodd"
				/>
			</svg>
		</button>
	</div>
</template>

<script setup lang="ts">
export interface UploadedFile {
	name: string;
	type: string;
	data: string;
}

const emit = defineEmits<{ files: [UploadedFile[]] }>();
const fileInput = ref<HTMLInputElement | null>(null);

function onFileSelect(event: Event) {
	const input = event.target as HTMLInputElement;
	if (!input.files?.length) return;

	const promises = Array.from(input.files).map(
		(file) =>
			new Promise<UploadedFile>((resolve) => {
				const reader = new FileReader();
				reader.onload = () => {
					resolve({
						name: file.name,
						type: file.type,
						data: (reader.result as string).split(',')[1],
					});
				};
				reader.readAsDataURL(file);
			}),
	);

	Promise.all(promises).then((files) => {
		emit('files', files);
		input.value = '';
	});
}
</script>
