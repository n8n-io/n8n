export = {
	credentials: {
		new: [
			() => {
				// Here any additional code can run or the creation blocked
				throw new Error('No additional credentials can be created.');
			},
		],
	},
};
