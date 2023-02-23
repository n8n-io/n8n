<template>
	<n8n-dropdown>
		<n8n-button>Dropdown</n8n-button>
		<template #header> Dropdown Header </template>
		<template #body>
			<n8n-dropdown-item>Action</n8n-dropdown-item>
			<n8n-dropdown-item>Another action</n8n-dropdown-item>
			<n8n-dropdown-item disabled>Disabled action</n8n-dropdown-item>
			<n8n-dropdown-item divided>Separated item</n8n-dropdown-item>
		</template>
		<template #footer> Dropdown Footer </template>
	</n8n-dropdown>
</template>
