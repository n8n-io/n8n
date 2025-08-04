'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
exports.DataRequestResponseStripper = void 0;
const a = __importStar(require('node:assert/strict'));
class DataRequestResponseStripper {
	constructor(dataResponse, stripParams) {
		this.dataResponse = dataResponse;
		this.stripParams = stripParams;
		this.requestedNodeNames = new Set();
		this.requestedNodeNames = new Set(stripParams.dataOfNodes);
		if (this.stripParams.prevNode && this.stripParams.dataOfNodes !== 'all') {
			this.requestedNodeNames.add(this.determinePrevNodeName());
		}
	}
	strip() {
		const { dataResponse: dr } = this;
		return {
			...dr,
			inputData: this.stripInputData(dr.inputData),
			envProviderState: this.stripEnvProviderState(dr.envProviderState),
			runExecutionData: this.stripRunExecutionData(dr.runExecutionData),
		};
	}
	stripRunExecutionData(runExecutionData) {
		if (this.stripParams.dataOfNodes === 'all') {
			return runExecutionData;
		}
		return {
			startData: runExecutionData.startData,
			resultData: {
				error: runExecutionData.resultData.error,
				lastNodeExecuted: runExecutionData.resultData.lastNodeExecuted,
				metadata: runExecutionData.resultData.metadata,
				runData: this.stripRunData(runExecutionData.resultData.runData),
				pinData: this.stripPinData(runExecutionData.resultData.pinData),
			},
			executionData: runExecutionData.executionData,
		};
	}
	stripRunData(runData) {
		return this.filterObjectByNodeNames(runData);
	}
	stripPinData(pinData) {
		return pinData ? this.filterObjectByNodeNames(pinData) : undefined;
	}
	stripEnvProviderState(envProviderState) {
		if (this.stripParams.env) {
			return envProviderState;
		}
		return {
			env: {},
			isEnvAccessBlocked: envProviderState.isEnvAccessBlocked,
			isProcessAvailable: envProviderState.isProcessAvailable,
		};
	}
	stripInputData(inputData) {
		if (!this.stripParams.input.include) {
			return {};
		}
		return this.stripParams.input.chunk ? this.stripChunkedInputData(inputData) : inputData;
	}
	stripChunkedInputData(inputData) {
		const { chunk } = this.stripParams.input;
		a.ok(chunk);
		const inputItems = inputData.main?.[0];
		if (!inputItems) {
			return inputData;
		}
		const chunkInputItems = inputItems.slice(chunk.startIndex, chunk.startIndex + chunk.count);
		const chunkedInputData = {
			...inputData,
			main: [chunkInputItems],
		};
		return chunkedInputData;
	}
	filterObjectByNodeNames(obj) {
		if (this.stripParams.dataOfNodes === 'all') {
			return obj;
		}
		const filteredObj = {};
		for (const nodeName in obj) {
			if (!Object.prototype.hasOwnProperty.call(obj, nodeName)) {
				continue;
			}
			if (this.requestedNodeNames.has(nodeName)) {
				filteredObj[nodeName] = obj[nodeName];
			}
		}
		return filteredObj;
	}
	determinePrevNodeName() {
		const sourceData = this.dataResponse.connectionInputSource?.main?.[0];
		if (!sourceData) {
			return '';
		}
		return sourceData.previousNode;
	}
}
exports.DataRequestResponseStripper = DataRequestResponseStripper;
//# sourceMappingURL=data-request-response-stripper.js.map
