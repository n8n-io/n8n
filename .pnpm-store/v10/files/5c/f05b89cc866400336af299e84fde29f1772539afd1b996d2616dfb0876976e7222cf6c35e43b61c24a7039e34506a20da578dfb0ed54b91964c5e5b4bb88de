var tmp = require("./index.js");
var Promise = require("bluebird"); // just for delay, this works with native promises
// disposer
tmp.withFile((path) => {
	console.log("Created at path", path);
	return Promise.delay(1000);
}).then(() => {
	console.log("File automatically disposed");
});