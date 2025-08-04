'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ExecutionDataService = void 0;
const di_1 = require('@n8n/di');
let ExecutionDataService = class ExecutionDataService {
	generateFailedExecutionFromError(mode, error, node, startTime = Date.now()) {
		const executionError = {
			...error,
			message: error.message,
			stack: error.stack,
		};
		const returnData = {
			data: {
				resultData: {
					error: executionError,
					runData: {},
				},
			},
			finished: false,
			mode,
			startedAt: new Date(),
			stoppedAt: new Date(),
			status: 'error',
		};
		if (node) {
			returnData.data.startData = {
				destinationNode: node.name,
				runNodeFilter: [node.name],
			};
			returnData.data.resultData.lastNodeExecuted = node.name;
			returnData.data.resultData.runData[node.name] = [
				{
					startTime,
					executionIndex: 0,
					executionTime: 0,
					executionStatus: 'error',
					error: executionError,
					source: [],
				},
			];
			returnData.data.executionData = {
				contextData: {},
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
				nodeExecutionStack: [
					{
						node,
						data: {},
						source: null,
					},
				],
			};
		}
		return returnData;
	}
};
exports.ExecutionDataService = ExecutionDataService;
exports.ExecutionDataService = ExecutionDataService = __decorate(
	[(0, di_1.Service)()],
	ExecutionDataService,
);
//# sourceMappingURL=execution-data.service.js.map
