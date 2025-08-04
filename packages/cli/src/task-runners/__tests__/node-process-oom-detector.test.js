'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const node_child_process_1 = require('node:child_process');
const node_process_oom_detector_1 = require('../node-process-oom-detector');
describe('NodeProcessOomDetector', () => {
	test('should detect an out-of-memory error in a monitored process', (done) => {
		const childProcess = (0, node_child_process_1.spawn)(process.execPath, [
			'--max-old-space-size=20',
			'-e',
			`
      const data = [];
			// fill memory until it crashes
      while (true) data.push(Array.from({ length: 10_000 }).map(() => Math.random().toString()).join());
      `,
		]);
		const detector = new node_process_oom_detector_1.NodeProcessOomDetector(childProcess);
		childProcess.on('exit', (code) => {
			expect(detector.didProcessOom).toBe(true);
			expect(code).not.toBe(0);
			done();
		});
	});
	test('should not detect an out-of-memory error in a process that exits normally', (done) => {
		const childProcess = (0, node_child_process_1.spawn)(process.execPath, [
			'-e',
			`
      console.log("Hello, World!");
      `,
		]);
		const detector = new node_process_oom_detector_1.NodeProcessOomDetector(childProcess);
		childProcess.on('exit', (code) => {
			expect(detector.didProcessOom).toBe(false);
			expect(code).toBe(0);
			done();
		});
	});
});
//# sourceMappingURL=node-process-oom-detector.test.js.map
