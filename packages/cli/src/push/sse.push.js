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
exports.SSEPush = void 0;
const di_1 = require('@n8n/di');
const abstract_push_1 = require('./abstract.push');
let SSEPush = class SSEPush extends abstract_push_1.AbstractPush {
	add(pushRef, userId, connection) {
		const { req, res } = connection;
		req.socket.setTimeout(0);
		req.socket.setNoDelay(true);
		req.socket.setKeepAlive(true);
		res.setHeader('Content-Type', 'text/event-stream; charset=UTF-8');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.writeHead(200);
		res.write(':ok\n\n');
		res.flush();
		super.add(pushRef, userId, connection);
		const removeClient = () => this.remove(pushRef);
		req.once('end', removeClient);
		req.once('close', removeClient);
		res.once('finish', removeClient);
	}
	close({ res }) {
		res.end();
	}
	sendToOneConnection(connection, data) {
		const { res } = connection;
		res.write('data: ' + data + '\n\n');
		res.flush();
	}
	ping({ res }) {
		res.write(':ping\n\n');
		res.flush();
	}
};
exports.SSEPush = SSEPush;
exports.SSEPush = SSEPush = __decorate([(0, di_1.Service)()], SSEPush);
//# sourceMappingURL=sse.push.js.map
