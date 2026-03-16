<template>
	<div class="border-b border-gray-800 bg-gray-950">
		<!-- Header -->
		<div
			class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-gray-100 transition-colors cursor-pointer"
			role="button"
			tabindex="0"
			@click="expanded = !expanded"
			@keydown.enter="expanded = !expanded"
			@keydown.space.prevent="expanded = !expanded"
		>
			<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
				/>
			</svg>
			<span class="font-medium">Credentials</span>
			<span
				v-if="credentials.length"
				class="px-1.5 py-0.5 text-xs rounded-full bg-gray-800 text-gray-400"
			>
				{{ credentials.length }}
			</span>
			<div class="flex-1" />
			<button
				class="p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
				title="Add credential"
				@click.stop="openAdd"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
			</button>
			<svg
				class="w-4 h-4 text-gray-500 transition-transform"
				:class="{ 'rotate-180': expanded }"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</div>

		<!-- Expanded list -->
		<div v-if="expanded" class="max-h-48 overflow-auto px-4 pb-2">
			<div v-if="!credentials.length" class="text-sm text-gray-600 py-1">No credentials yet</div>
			<div v-for="cred in credentials" :key="cred.name" class="flex items-center gap-2 py-1 group">
				<span class="text-sm text-gray-300 truncate">{{ cred.name }}</span>
				<span class="text-xs text-gray-600 font-mono truncate">{{ cred.maskedKey }}</span>
				<div class="flex-1" />
				<button
					class="text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
					title="Edit"
					@click="openEdit(cred.name)"
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
						/>
					</svg>
				</button>
			</div>
		</div>

		<!-- Modal -->
		<CredentialModal v-if="modalOpen" :edit-name="editingName" @close="onModalClose" />
	</div>
</template>

<script setup lang="ts">
interface Credential {
	name: string;
	maskedKey: string;
}

const expanded = ref(false);
const credentials = ref<Credential[]>([]);
const modalOpen = ref(false);
const editingName = ref<string | undefined>();

async function fetchCredentials() {
	try {
		const data = await $fetch<{ credentials: Credential[] }>('/api/credentials');
		credentials.value = data.credentials;
	} catch {
		// silently fail
	}
}

function openAdd() {
	editingName.value = undefined;
	modalOpen.value = true;
}

function openEdit(name: string) {
	editingName.value = name;
	modalOpen.value = true;
}

function onModalClose() {
	modalOpen.value = false;
	editingName.value = undefined;
	fetchCredentials();
}

onMounted(fetchCredentials);
</script>
