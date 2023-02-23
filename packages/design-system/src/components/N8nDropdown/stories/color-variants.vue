<template>
	<div>
		<n8n-dropdown color="light">
			<n8n-button color="light">Light Dropdown</n8n-button>
			<template #body>
				<n8n-dropdown-item>Action</n8n-dropdown-item>
				<n8n-dropdown-item>Another action</n8n-dropdown-item>
				<n8n-dropdown-item disabled>Disabled action</n8n-dropdown-item>
				<n8n-dropdown-item divided>Separated item</n8n-dropdown-item>
			</template>
		</n8n-dropdown>

		<n8n-dropdown color="dark">
			<n8n-button color="dark">Dark Dropdown</n8n-button>
			<template #body>
				<n8n-dropdown-item>Action</n8n-dropdown-item>
				<n8n-dropdown-item>Another action</n8n-dropdown-item>
				<n8n-dropdown-item disabled>Disabled action</n8n-dropdown-item>
				<n8n-dropdown-item divided>Separated item</n8n-dropdown-item>
			</template>
		</n8n-dropdown>
	</div>
</template>
