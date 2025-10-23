// Child process that receives data and sends it back
process.on('message', (payload) => {
	// Echo back the data
	if (process.send) {
		process.send(payload.data);
	}
});
