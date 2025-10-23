const Piscina = require('piscina');
const { resolve } = require('path');
const FlatBuffers = require('flatbuffers');

const piscina = new Piscina({
	filename: resolve(__dirname, 'worker.js'),
	resourceLimits: {
		// maxOldGenerationSizeMb: 150,
		// maxYoungGenerationSizeMb: 4,
		// codeRangeSizeMb: 16,
	},
});

const kb = 1024;
const mb = kb * kb;
const gb = mb * kb;

(async function () {
	while (true) {
		try {
			const buffer = Buffer.alloc(200 * mb);

			// Serialize using FlatBuffers
			const builder = new FlatBuffers.Builder(buffer.length + 100);
			const dataVector = builder.createByteVector(buffer);

			const label = 'round trip';
			console.time(label);

			const option = 2;
			if (option === 1) {
				await piscina.run(buffer.toString('utf8'));
			} else if (option === 2) {
				console.time('create ArrayBuffer');
				const payload = new ArrayBuffer(buffer);
				console.timeEnd('create ArrayBuffer');
				await piscina.run(payload);
			} else if (option === 3) {
				console.time('create ArrayBuffer');
				const payload = new ArrayBuffer(buffer);
				console.timeEnd('create ArrayBuffer');
				await piscina.run(payload, { transferList: [payload] });
			} else if (option === 4) {
				builder.startObject(1);
				builder.addFieldOffset(0, dataVector, 0);
				const root = builder.endObject();
				builder.finish(root);
				const serialized = builder.asUint8Array();
				await piscina.run(serialized);
			} else if (option === 5) {
				console.time('create flatbuffer');
				builder.startObject(1);
				builder.addFieldOffset(0, dataVector, 0);
				const root = builder.endObject();
				builder.finish(root);
				const serialized = builder.asUint8Array();
				console.timeEnd('create flatbuffer');
				await piscina.run(serialized, { transferList: [serialized.buffer] });
			}

			console.timeEnd(label);
		} catch (err) {
			console.log('Worker error:', err);
			if (err.code === 'ERR_WORKER_OUT_OF_MEMORY') {
				console.log('Worker terminated due to resource limits');
			}
		}
	}
})();

setInterval(() => reportMemory('[main]'), 1000);
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
