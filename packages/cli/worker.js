// Worker receives payload and returns it back
// Payload can be { type: 'string', data: string } or { type: 'object', data: object }
module.exports = async (payload) => {
	// Simply echo back the data
	return payload.data;
};
