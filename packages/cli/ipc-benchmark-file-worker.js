const fs = require('fs');

// Child process that reads from file and sends confirmation
process.on('message', (payload) => {
	try {
		// Read from file
		const data = fs.readFileSync(payload.filePath, 'utf8');

		// Parse if it's an object
		if (payload.type === 'object') {
			JSON.parse(data);
		}

		// Send confirmation back
		if (process.send) {
			process.send({ success: true });
		}
	} catch (err) {
		if (process.send) {
			process.send({ success: false, error: err.message });
		}
	}
});
