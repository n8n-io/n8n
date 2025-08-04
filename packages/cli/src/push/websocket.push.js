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
exports.WebSocketPush = void 0;
const api_types_1 = require('@n8n/api-types');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const abstract_push_1 = require('./abstract.push');
function heartbeat() {
	this.isAlive = true;
}
let WebSocketPush = class WebSocketPush extends abstract_push_1.AbstractPush {
	add(pushRef, userId, connection) {
		connection.isAlive = true;
		connection.on('pong', heartbeat);
		super.add(pushRef, userId, connection);
		const onMessage = async (data) => {
			try {
				const buffer = Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data);
				const msg = JSON.parse(buffer.toString('utf8'));
				if (await this.isClientHeartbeat(msg)) {
					return;
				}
				this.onMessageReceived(pushRef, msg);
			} catch (error) {
				this.errorReporter.error(
					new n8n_workflow_1.UnexpectedError('Error parsing push message', {
						extra: {
							userId,
							data,
						},
						cause: error,
					}),
				);
				this.logger.error("Couldn't parse message from editor-UI", {
					error: error,
					pushRef,
					data,
				});
			}
		};
		connection.once('close', () => {
			connection.off('pong', heartbeat);
			connection.off('message', onMessage);
			this.remove(pushRef);
		});
		connection.on('message', onMessage);
	}
	close(connection) {
		connection.close();
	}
	sendToOneConnection(connection, data) {
		connection.send(data);
	}
	ping(connection) {
		if (!connection.isAlive) {
			return connection.terminate();
		}
		connection.isAlive = false;
		connection.ping();
	}
	async isClientHeartbeat(msg) {
		const result = await api_types_1.heartbeatMessageSchema.safeParseAsync(msg);
		return result.success;
	}
};
exports.WebSocketPush = WebSocketPush;
exports.WebSocketPush = WebSocketPush = __decorate([(0, di_1.Service)()], WebSocketPush);
//# sourceMappingURL=websocket.push.js.map
