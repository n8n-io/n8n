<template>
	<n8n-dropdown>
		<n8n-button>Dropdown</n8n-button>
		<template #body>
			<n8n-dropdown-item :to="{ name: 'docs-components-dropdown' }" exact-active-class="-active">
				Active Router Link
			</n8n-dropdown-item>
			<n8n-dropdown-item active>Active Item</n8n-dropdown-item>
		</template>
	</n8n-dropdown>
</template>
