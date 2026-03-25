'use strict';
let WebSocket = require('ws');
let ivm = require('./isolated-vm');

/**
 * IMPORTANT: Allowing untrusted users to access the v8 inspector will almost certainly result in a
 * security vulnerability. Access to these endpoints should be restricted.
 */

// Launch an infinite loop in another thread
let isolate = new ivm.Isolate({ inspector: true });
(async function() {
	let context = await isolate.createContext({ inspector: true });
	const inspector = isolate.createInspectorSession();
	inspector.dispatchProtocolMessage('{"id":1,"method":"Debugger.enable"}');
	await context.eval('/* break on script start */debugger;');
	inspector.dispose();
	let script = await isolate.compileScript('console.log("hello world")', { filename: 'example.js' });
	await script.run(context);
}()).catch(console.error);

// Create an inspector channel on port 10000
let wss = new WebSocket.Server({ port: 10000 });

wss.on('connection', function(ws) {
	// Dispose inspector session on websocket disconnect
	let channel = isolate.createInspectorSession();
	function dispose() {
		try {
			channel.dispose();
		} catch (err) {}
	}
	ws.on('error', dispose);
	ws.on('close', dispose);

	// Relay messages from frontend to backend
	ws.on('message', function(message) {
		console.log('<', message.toString())
		try {
			channel.dispatchProtocolMessage(String(message));
		} catch (err) {
			// This happens if inspector session was closed unexpectedly
			ws.close();
		}
	});

	// Relay messages from backend to frontend
	function send(message) {
		console.log('>', message.toString())
		try {
			ws.send(message);
		} catch (err) {
			dispose();
		}
	}
	channel.onResponse = (callId, message) => send(message);
	channel.onNotification = send;
});
console.log('Inspector: devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=127.0.0.1:10000');
