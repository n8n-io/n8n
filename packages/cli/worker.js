const FlatBuffers = require('flatbuffers');

module.exports = async (serialized) => {
	reportMemory('[worker]');

	// Deserialize FlatBuffer
	const buf = new FlatBuffers.ByteBuffer(serialized);
	buf.setPosition(buf.capacity() - 4); // Read root offset
	const rootOffset = buf.readInt32(buf.position());
	buf.setPosition(rootOffset);

	// Read the table
	const vtableOffset = buf.readInt16(buf.position());
	const dataOffset = buf.__indirect(buf.position() + vtableOffset);
	const dataLength = buf.readInt32(dataOffset);

	// Extract the byte vector
	const data = buf.bytes().slice(dataOffset + 4, dataOffset + 4 + dataLength);

	return data;

	// return setTimeout(10000);
	// const array = [];
	// while (true) {
	// 	array.push([array]);
	// }
};

setInterval(() => reportMemory('[worker]'), 1000);
function reportMemory(msg = '') {
	const memoryUsage = process.memoryUsage();
	console.log(msg, {
		type: 'memoryReport',
		memory: {
			rss: memoryUsage.rss / 1024 / 1024, // Resident Set Size in MB
			heapTotal: memoryUsage.heapTotal / 1024 / 1024, // Total heap size in MB
			heapUsed: memoryUsage.heapUsed / 1024 / 1024, // Used heap size in MB
			external: memoryUsage.external / 1024 / 1024, // External memory in MB
		},
	});
}
