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
exports.NodeProcessOomDetector = void 0;
const a = __importStar(require('node:assert/strict'));
class NodeProcessOomDetector {
	get didProcessOom() {
		return this._didProcessOom;
	}
	constructor(processToMonitor) {
		this._didProcessOom = false;
		this.onStderr = (data) => {
			if (data.includes('JavaScript heap out of memory')) {
				this._didProcessOom = true;
			}
		};
		this.monitorProcess(processToMonitor);
	}
	monitorProcess(processToMonitor) {
		a.ok(processToMonitor.stderr, "Can't monitor a process without stderr");
		processToMonitor.stderr.on('data', this.onStderr);
		processToMonitor.once('exit', () => {
			processToMonitor.stderr?.off('data', this.onStderr);
		});
	}
}
exports.NodeProcessOomDetector = NodeProcessOomDetector;
//# sourceMappingURL=node-process-oom-detector.js.map
