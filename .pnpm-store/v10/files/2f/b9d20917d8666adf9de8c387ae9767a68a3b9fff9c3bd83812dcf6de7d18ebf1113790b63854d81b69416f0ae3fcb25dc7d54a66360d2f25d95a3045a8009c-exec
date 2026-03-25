#!/usr/bin/env node
//
// alaserver.js = Alasql Server
// Date: 25.11.2014
// (c) 2014, Andrey Gershun
//

var alasql = require('alasql');
var http = require('http');
var url = require('url');
var port = (process.argv[2] || 1337) | 0;
if (!port) {
	throw new Error('Wrong port number ' + process.argv[3]);
}

http
	.createServer(function (req, res) {
		var sql = decodeURI(url.parse(req.url).search).substr(1);
		var a = '';
		try {
			a = alasql(sql);
		} catch (err) {
			a = err.toString();
		}
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify(a));
	})
	.listen(port, '127.0.0.1');

console.log('Server running at http://127.0.0.1:' + port + '/');
