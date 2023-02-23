<template>
	<div>
		<n8n-dropdown size="sm">
			<n8n-button>Small Dropdown</n8n-button>
			<template #body>
				<n8n-dropdown-item>Action</n8n-dropdown-item>
				<n8n-dropdown-item>Another action</n8n-dropdown-item>
				<n8n-dropdown-item disabled>Disabled action</n8n-dropdown-item>
				<n8n-dropdown-item divided>Separated item</n8n-dropdown-item>
			</template>
		</n8n-dropdown>

		<n8n-dropdown size="md">
			<n8n-button>Medium Dropdown</n8n-button>
			<template #body>
				<n8n-dropdown-item>Action</n8n-dropdown-item>
				<n8n-dropdown-item>Another action</n8n-dropdown-item>
				<n8n-dropdown-item disabled>Disabled action</n8n-dropdown-item>
				<n8n-dropdown-item divided>Separated item</n8n-dropdown-item>
			</template>
		</n8n-dropdown>

		<n8n-dropdown size="lg">
			<n8n-button>Large Dropdown</n8n-button>
			<template #body>
				<n8n-dropdown-item>Action</n8n-dropdown-item>
				<n8n-dropdown-item>Another action</n8n-dropdown-item>
				<n8n-dropdown-item disabled>Disabled action</n8n-dropdown-item>
				<n8n-dropdown-item divided>Separated item</n8n-dropdown-item>
			</template>
		</n8n-dropdown>
	</div>
</template>
