<template>
	<n8n-tooltip class="primary-color" placement="bottom-end" >
		<div slot="content">
			{{ $baseText('readOnly.youreViewingTheLogOf') }}
		</div>
		<span>
			<font-awesome-icon icon="exclamation-triangle" />
			{{ $baseText('readOnly.readOnly') }}
		</span>
	</n8n-tooltip>
</template>
