'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.IMMEDIATE_COMMANDS =
	exports.SELF_SEND_COMMANDS =
	exports.WORKER_RESPONSE_PUBSUB_CHANNEL =
	exports.COMMAND_PUBSUB_CHANNEL =
	exports.JOB_TYPE_NAME =
	exports.QUEUE_NAME =
		void 0;
exports.QUEUE_NAME = 'jobs';
exports.JOB_TYPE_NAME = 'job';
exports.COMMAND_PUBSUB_CHANNEL = 'n8n.commands';
exports.WORKER_RESPONSE_PUBSUB_CHANNEL = 'n8n.worker-response';
exports.SELF_SEND_COMMANDS = new Set([
	'add-webhooks-triggers-and-pollers',
	'remove-triggers-and-pollers',
]);
exports.IMMEDIATE_COMMANDS = new Set([
	'add-webhooks-triggers-and-pollers',
	'remove-triggers-and-pollers',
	'relay-execution-lifecycle-event',
]);
//# sourceMappingURL=constants.js.map
