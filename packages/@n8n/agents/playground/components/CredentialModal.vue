<template>
	<Teleport to="body">
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
			@mousedown.self="emit('close')"
		>
			<div class="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-96 p-6">
				<h2 class="text-lg font-semibold mb-4">
					{{ isEdit ? 'Edit Credential' : 'Add Credential' }}
				</h2>

				<label class="block text-sm text-gray-400 mb-1">Name</label>
				<input
					v-model="name"
					:disabled="isEdit"
					type="text"
					placeholder="e.g. anthropic"
					class="w-full px-3 py-2 mb-4 rounded-md bg-gray-800 border border-gray-700 text-gray-100 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
				/>

				<label class="block text-sm text-gray-400 mb-1">API Key</label>
				<div class="relative mb-4">
					<input
						v-model="apiKey"
						:type="showKey ? 'text' : 'password'"
						placeholder="sk-..."
						class="w-full px-3 py-2 pr-10 rounded-md bg-gray-800 border border-gray-700 text-gray-100 text-sm font-mono focus:outline-none focus:border-blue-500"
					/>
					<button
						type="button"
						class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
						@click="showKey = !showKey"
					>
						<svg
							v-if="showKey"
							class="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
							/>
						</svg>
						<svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
							/>
						</svg>
					</button>
				</div>

				<div v-if="error" class="mb-4 text-sm text-red-400">{{ error }}</div>

				<div class="flex justify-end gap-2">
					<button
						v-if="isEdit"
						class="px-3 py-1.5 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
						@click="onDelete"
					>
						Delete
					</button>
					<div class="flex-1" />
					<button
						class="px-3 py-1.5 text-sm rounded-md text-gray-400 hover:text-gray-200 transition-colors"
						@click="emit('close')"
					>
						Cancel
					</button>
					<button
						class="px-3 py-1.5 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
						:disabled="!canSave || saving"
						@click="onSave"
					>
						{{ saving ? 'Saving...' : 'Save' }}
					</button>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
	editName?: string;
}>();

const emit = defineEmits<{
	close: [];
}>();

const isEdit = computed(() => !!props.editName);
const name = ref(props.editName ?? '');
const apiKey = ref('');
const showKey = ref(false);
const saving = ref(false);
const error = ref('');

const canSave = computed(() => name.value.trim() && apiKey.value.trim());

async function onSave() {
	saving.value = true;
	error.value = '';
	try {
		if (isEdit.value) {
			await $fetch(`/api/credentials/${encodeURIComponent(name.value)}`, {
				method: 'PUT',
				body: { apiKey: apiKey.value },
			});
		} else {
			await $fetch('/api/credentials', {
				method: 'POST',
				body: { name: name.value.trim(), apiKey: apiKey.value.trim() },
			});
		}
		emit('close');
	} catch (e: unknown) {
		const fetchErr = e as { data?: { message?: string }; statusMessage?: string };
		error.value = fetchErr.data?.message ?? fetchErr.statusMessage ?? 'Failed to save';
	} finally {
		saving.value = false;
	}
}

async function onDelete() {
	saving.value = true;
	error.value = '';
	try {
		await $fetch(`/api/credentials/${encodeURIComponent(name.value)}`, {
			method: 'DELETE',
		});
		emit('close');
	} catch (e: unknown) {
		const fetchErr = e as { data?: { message?: string }; statusMessage?: string };
		error.value = fetchErr.data?.message ?? fetchErr.statusMessage ?? 'Failed to delete';
	} finally {
		saving.value = false;
	}
}
</script>
