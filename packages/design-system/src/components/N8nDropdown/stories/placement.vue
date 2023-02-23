<template>
	<div>
		<n8n-dropdown placement="top">
			<n8n-button>Top Dropdown</n8n-button>
			<template #body>
				<n8n-dropdown-item>Action</n8n-dropdown-item>
				<n8n-dropdown-item>Another action</n8n-dropdown-item>
				<n8n-dropdown-item disabled>Disabled action</n8n-dropdown-item>
				<n8n-dropdown-item divided>Separated item</n8n-dropdown-item>
			</template>
		</n8n-dropdown>

		<n8n-dropdown placement="bottom">
			<n8n-button>Bottom Dropdown</n8n-button>
			<template #body>
				<n8n-dropdown-item>Action</n8n-dropdown-item>
				<n8n-dropdown-item>Another action</n8n-dropdown-item>
				<n8n-dropdown-item disabled>Disabled action</n8n-dropdown-item>
				<n8n-dropdown-item divided>Separated item</n8n-dropdown-item>
			</template>
		</n8n-dropdown>

		<n8n-dropdown placement="left">
			<n8n-button>Left Dropdown</n8n-button>
			<template #body>
				<n8n-dropdown-item>Action</n8n-dropdown-item>
				<n8n-dropdown-item>Another action</n8n-dropdown-item>
				<n8n-dropdown-item disabled>Disabled action</n8n-dropdown-item>
				<n8n-dropdown-item divided>Separated item</n8n-dropdown-item>
			</template>
		</n8n-dropdown>

		<n8n-dropdown placement="right">
			<n8n-button>Right Dropdown</n8n-button>
			<template #body>
				<n8n-dropdown-item>Action</n8n-dropdown-item>
				<n8n-dropdown-item>Another action</n8n-dropdown-item>
				<n8n-dropdown-item disabled>Disabled action</n8n-dropdown-item>
				<n8n-dropdown-item divided>Separated item</n8n-dropdown-item>
			</template>
		</n8n-dropdown>
	</div>
</template>
