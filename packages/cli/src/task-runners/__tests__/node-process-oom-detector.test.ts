import { spawn } from 'node:child_process';

import { NodeProcessOomDetector } from '../node-process-oom-detector';

describe('NodeProcessOomDetector', () => {
	test('should detect an out-of-memory error in a monitored process', async () => {
		const childProcess = spawn(process.execPath, [
			// set low memory limit
			'--max-old-space-size=20',
			'-e',
			`
      const data = [];
			// fill memory until it crashes
      while (true) data.push(Array.from({ length: 10_000 }).map(() => Math.random().toString()).join());
      `,
		]);

		const detector = new NodeProcessOomDetector(childProcess);

		await new Promise<void>((resolve, reject) => {
			childProcess.on('exit', (code) => {
				try {
					expect(detector.didProcessOom).toBe(true);
					expect(code).not.toBe(0);
					resolve();
				} catch (error) {
					reject(error as Error);
				}
			});
		});
	});

	test('should not detect an out-of-memory error in a process that exits normally', async () => {
		const childProcess = spawn(process.execPath, [
			'-e',
			`
      console.log("Hello, World!");
      `,
		]);

		const detector = new NodeProcessOomDetector(childProcess);

		await new Promise<void>((resolve, reject) => {
			childProcess.on('exit', (code) => {
				try {
					expect(detector.didProcessOom).toBe(false);
					expect(code).toBe(0);
					resolve();
				} catch (error) {
					reject(error as Error);
				}
			});
		});
	});
});
