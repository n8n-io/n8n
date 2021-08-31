<template>
	<n8n-tooltip class="primary-color" placement="bottom-end" >
		<div slot="content">
			You're viewing the log of a previous execution. You cannot<br />
			make changes since this execution already occured. Make changes<br />
			to this workflow by clicking on its name on the left.
		</div>
		<span>
			<font-awesome-icon icon="exclamation-triangle" />
			Read only
		</span>
	</n8n-tooltip>
</template>
