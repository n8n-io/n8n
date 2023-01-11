<template>
	<Modal
		:name="EXECUTION_EVENTS_MODAL_KEY"
		width="80%"
		:title="`${$locale.baseText(
			'executionsList.workflowExecutionEvents',
		)} (Execution ID: ${executionId})`"
		:eventBus="modalBus"
	>
		<template #content>
			<div class="mainContent">
				<template v-if="executionEvents.length === 0">
					<n8n-text class="nodata">
						{{ $locale.baseText('executionEvents.noData') }}
					</n8n-text>
				</template>
				<template v-else>
					<el-table :data="executionEvents" stripe v-loading="isDataLoading">
						<el-table-column
							property="id"
							:label="$locale.baseText('executionEvents.table.ts')"
							width="280"
						>
							<template #default="scope">
								{{ dateformat(scope.row.ts, 'yyyy-mm-dd HH:MM:ss.l') }}<br />
								<small v-if="scope.row.id">ID: {{ scope.row.id }}</small>
							</template>
						</el-table-column>
						<el-table-column
							property="eventName"
							:label="$locale.baseText('executionEvents.table.eventName')"
						>
							<template #default="scope">
								<span v-if="scope.row.message">
									<div>{{ scope.row.message }}</div>
									<small>{{ scope.row.eventName }}</small>
								</span>
								<span v-else>{{ scope.row.eventName }}</span>
							</template>
						</el-table-column>
						<el-table-column
							property="payload"
							:label="$locale.baseText('executionEvents.table.nodeName')"
						>
							<template #default="scope">
								<span v-if="scope.row.payload?.nodeName">
									<div>{{ scope.row.payload?.nodeName }}</div>
									<small>{{ scope.row.payload?.workflowName }}</small>
								</span>
							</template>
						</el-table-column>
					</el-table>
				</template>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
/* eslint-disable prefer-spread */
import Vue from 'vue';
import mixins from 'vue-typed-mixins';
import Modal from '@/components/Modal.vue';
import dateformat from 'dateformat';
import { showMessage } from '@/mixins/showMessage';
import { convertToDisplayDate } from '@/utils';
import { EXECUTION_EVENTS_MODAL_KEY } from '@/constants';

import { restApi } from '@/mixins/restApi';
import { IAbstractEventMessage } from 'n8n-workflow';

export default mixins(restApi, showMessage).extend({
	name: 'ExecutionEvents',
	props: {
		modalName: String,
		executionId: String,
		workflowName: String,
		workflowId: String,
	},
	components: {
		Modal,
	},
	data() {
		return {
			executionEvents: [] as IAbstractEventMessage[],
			modalBus: new Vue(),
			EXECUTION_EVENTS_MODAL_KEY,
			isDataLoading: false,
		};
	},
	async mounted() {
		this.isDataLoading = true;
		try {
			const eventFetchResult = await this.restApi().makeRestApiRequest(
				'GET',
				'/eventbus/execution/' + id,
			);
			const uniqueEvents = eventFetchResult.filter(
				(event: IAbstractEventMessage, index: number, self: IAbstractEventMessage[]) =>
					index === self.findIndex((t) => t.id === event.id),
			);
			this.executionEvents = uniqueEvents;
			console.log(this.executionEvents);
		} catch (error) {
			this.$showError(
				error,
				this.$locale.baseText('executionsList.showError.getExecutionEvents.title'),
			);
			return;
		}
		this.isDataLoading = false;
	},
	methods: {
		convertToDisplayDate,
		dateformat,
	},
});
</script>

<style scoped lang="scss">
.nodata {
	padding-bottom: 0.5em;
}

.mainContent {
	overflow: auto;
}
</style>
