<script>
export default {
	data() {
		return {
			visible: false,
		};
	},
};
</script>
<template>
	<div>
		<n8n-dropdown events="click">
			<n8n-button>Click Dropdown</n8n-button>
			<template #body>
				<n8n-dropdown-item>Action</n8n-dropdown-item>
				<n8n-dropdown-item>Another action</n8n-dropdown-item>
				<n8n-dropdown-item disabled>Disabled action</n8n-dropdown-item>
				<n8n-dropdown-item divided>Separated item</n8n-dropdown-item>
			</template>
		</n8n-dropdown>

		<n8n-dropdown events="hover">
			<n8n-button>Hover Dropdown</n8n-button>
			<template #body>
				<n8n-dropdown-item>Action</n8n-dropdown-item>
				<n8n-dropdown-item>Another action</n8n-dropdown-item>
				<n8n-dropdown-item disabled>Disabled action</n8n-dropdown-item>
				<n8n-dropdown-item divided>Separated item</n8n-dropdown-item>
			</template>
		</n8n-dropdown>

		<n8n-dropdown events="focus">
			<n8n-button type="submit">Focus Dropdown</n8n-button>
			<template #body>
				<n8n-dropdown-item>Action</n8n-dropdown-item>
				<n8n-dropdown-item>Another action</n8n-dropdown-item>
				<n8n-dropdown-item disabled>Disabled action</n8n-dropdown-item>
				<n8n-dropdown-item divided>Separated item</n8n-dropdown-item>
			</template>
		</n8n-dropdown>

		<n8n-dropdown :events="['focus', 'hover']">
			<n8n-button>Multiple Events Dropdown</n8n-button>
			<template #body>
				<n8n-dropdown-item>Action</n8n-dropdown-item>
				<n8n-dropdown-item>Another action</n8n-dropdown-item>
				<n8n-dropdown-item disabled>Disabled action</n8n-dropdown-item>
				<n8n-dropdown-item divided>Separated item</n8n-dropdown-item>
			</template>
		</n8n-dropdown>

		<n8n-dropdown v-model:visible="visible" events="manual">
			<n8n-button @click="visible = !visible">Manual Dropdown</n8n-button>
			<template #body>
				<n8n-dropdown-item>Action</n8n-dropdown-item>
				<n8n-dropdown-item>Another action</n8n-dropdown-item>
				<n8n-dropdown-item disabled>Disabled action</n8n-dropdown-item>
				<n8n-dropdown-item divided>Separated item</n8n-dropdown-item>
			</template>
		</n8n-dropdown>
	</div>
</template>
