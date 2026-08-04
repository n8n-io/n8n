import { execSync } from 'node:child_process';

import { createSpinner, openUrl, sleep } from './utils';

vi.mock('node:child_process');

describe('dev utils', () => {
	describe('sleep', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should resolve after specified milliseconds', async () => {
			const promise = sleep(100);
			let resolved = false;

			void promise.then(() => {
				resolved = true;
			});

			vi.advanceTimersByTime(99);
			await Promise.resolve();

			expect(resolved).toBe(false);

			vi.advanceTimersByTime(1);
			await vi.runAllTimersAsync();

			expect(resolved).toBe(true);
			await expect(promise).resolves.toBeUndefined();
		});
	});

	describe('createSpinner', () => {
		it('should return a function that cycles through spinner frames', () => {
			const spinner = createSpinner('Loading');

			const frame1 = spinner();
			const frame2 = spinner();

			expect(frame1).toContain('Loading');
			expect(frame2).toContain('Loading');
			expect(frame1).not.toBe(frame2);
		});

		it('should cycle back to the first frame after all frames', () => {
			const spinner = createSpinner('Test');

			const frames = [];
			for (let i = 0; i < 11; i++) {
				frames.push(spinner());
			}

			expect(frames[0]).toBe(frames[10]);
		});
	});

	describe('openUrl', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should use "open" command on darwin platform', () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, 'platform', { value: 'darwin' });

			openUrl('http://localhost:5678');

			expect(execSync).toHaveBeenCalledWith('open "http://localhost:5678"');

			Object.defineProperty(process, 'platform', { value: originalPlatform });
		});

		it('should use "start" command on win32 platform with empty window title', () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, 'platform', { value: 'win32' });

			openUrl('http://localhost:5678');

			expect(execSync).toHaveBeenCalledWith('start "" "http://localhost:5678"');

			Object.defineProperty(process, 'platform', { value: originalPlatform });
		});

		it('should use "xdg-open" command on linux platform', () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, 'platform', { value: 'linux' });

			openUrl('http://localhost:5678');

			expect(execSync).toHaveBeenCalledWith('xdg-open "http://localhost:5678"');

			Object.defineProperty(process, 'platform', { value: originalPlatform });
		});

		it('should escape double quotes in URL', () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, 'platform', { value: 'darwin' });

			openUrl('http://localhost:5678?query="value"');

			expect(execSync).toHaveBeenCalledWith('open "http://localhost:5678?query=\\"value\\""');

			Object.defineProperty(process, 'platform', { value: originalPlatform });
		});

		it('should not throw if execSync fails', () => {
			vi.mocked(execSync).mockImplementation(() => {
				throw new Error('Command failed');
			});

			expect(() => openUrl('http://localhost:5678')).not.toThrow();
		});
	});
});
