// n8n function that explicitly processes the items parameter

module.exports = function (items) {
	// Log the items to see what we're getting
	console.log('Received items:', JSON.stringify(items));

	// Process each item in the input
	return items.map((item) => {
		// Return a new item with our data
		return {
			json: {
				originalItem: item.json,
				processed: true,
				timestamp: new Date().toISOString(),
			},
		};
	});
};
