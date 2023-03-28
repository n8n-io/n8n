<script>
export default {
	inject: ['editor'],
	data() {
		return {
			plainData: '',
		};
	},
	methods: {
		doExport() {
			this.plainData = this.editor.export();
		},
		doImport() {
			this.editor.import(this.plainData);
		},
	},
};
</script>
<template>
	<div>
		<div class="form-group">
			<textarea class="form-control" v-model="plainData"></textarea>
		</div>
		<button class="btn btn-primary mr-1" @click="doExport">Export</button>
		<button class="btn btn-secondary" @click="doImport">Import</button>
	</div>
</template>
