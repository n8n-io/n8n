import type { GatewayConfig } from './config';
import { logger, printModuleStatus } from './logger';

const BASE_CONFIG: GatewayConfig = {
	logLevel: 'info',
	port: 7655,
	allowedOrigins: [],
	filesystem: { dir: '/test' },
	computer: { shell: { timeout: 30_000 } },
	browser: {
		defaultBrowser: 'chrome',
	},
	permissions: {},
	permissionConfirmation: 'instance',
};

/** Find the message logged for a specific module by inspecting the meta argument. */
function messageFor(spy: jest.SpyInstance, module: string): string {
	const call: [string, Record<string, unknown>] | undefined = (
		spy.mock.calls as Array<[string, Record<string, unknown>]>
	).find(([, meta]) => meta?.module === module);
	return call?.[0] ?? '';
}

describe('printModuleStatus', () => {
	let infoSpy: jest.SpyInstance;

	beforeEach(() => {
		infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
	});

	afterEach(() => {
		infoSpy.mockRestore();
	});

	// ---------------------------------------------------------------------------
	// Filesystem read
	// ---------------------------------------------------------------------------

	describe('Filesystem read', () => {
		it('shows ✓ and directory path when allow', () => {
			printModuleStatus({ ...BASE_CONFIG, permissions: { filesystemRead: 'allow' } });
			const msg = messageFor(infoSpy, 'FilesystemRead');
			expect(msg).toContain('✓');
			expect(msg).toContain('/test');
			expect(msg).not.toContain('(disabled)');
		});

		it('shows ? and directory path when ask', () => {
			printModuleStatus({ ...BASE_CONFIG, permissions: { filesystemRead: 'ask' } });
			const msg = messageFor(infoSpy, 'FilesystemRead');
			expect(msg).toContain('?');
			expect(msg).toContain('/test');
			expect(msg).not.toContain('(disabled)');
		});

		it('shows ✗ and (disabled) when deny', () => {
			printModuleStatus({ ...BASE_CONFIG, permissions: { filesystemRead: 'deny' } });
			const msg = messageFor(infoSpy, 'FilesystemRead');
			expect(msg).toContain('✗');
			expect(msg).toContain('(disabled)');
		});

		it('defaults to deny when not specified', () => {
			printModuleStatus({ ...BASE_CONFIG, permissions: {} });
			const msg = messageFor(infoSpy, 'FilesystemRead');
			expect(msg).toContain('✗');
			expect(msg).toContain('(disabled)');
		});
	});

	// ---------------------------------------------------------------------------
	// Filesystem write
	// ---------------------------------------------------------------------------

	describe('Filesystem write', () => {
		it('shows ✓ and directory path when allow', () => {
			printModuleStatus({
				...BASE_CONFIG,
				permissions: { filesystemRead: 'allow', filesystemWrite: 'allow' },
			});
			const msg = messageFor(infoSpy, 'FilesystemWrite');
			expect(msg).toContain('✓');
			expect(msg).toContain('/test');
			expect(msg).not.toContain('(disabled)');
		});

		it('shows ? and directory path when ask', () => {
			printModuleStatus({
				...BASE_CONFIG,
				permissions: { filesystemRead: 'allow', filesystemWrite: 'ask' },
			});
			const msg = messageFor(infoSpy, 'FilesystemWrite');
			expect(msg).toContain('?');
			expect(msg).toContain('/test');
		});

		it('shows ✗ and (disabled) when deny', () => {
			printModuleStatus({
				...BASE_CONFIG,
				permissions: { filesystemRead: 'allow', filesystemWrite: 'deny' },
			});
			const msg = messageFor(infoSpy, 'FilesystemWrite');
			expect(msg).toContain('✗');
			expect(msg).toContain('(disabled)');
		});

		it('is forced to deny when filesystemRead is deny, regardless of filesystemWrite setting', () => {
			printModuleStatus({
				...BASE_CONFIG,
				permissions: { filesystemRead: 'deny', filesystemWrite: 'allow' },
			});
			const msg = messageFor(infoSpy, 'FilesystemWrite');
			expect(msg).toContain('✗');
			expect(msg).toContain('(disabled)');
		});
	});

	// ---------------------------------------------------------------------------
	// Shell
	// ---------------------------------------------------------------------------

	describe('Shell', () => {
		it('shows ✓ and timeout when allow', () => {
			printModuleStatus({ ...BASE_CONFIG, permissions: { shell: 'allow' } });
			const msg = messageFor(infoSpy, 'Shell');
			expect(msg).toContain('✓');
			expect(msg).toContain('timeout: 30s');
		});

		it('shows ? and timeout when ask', () => {
			printModuleStatus({ ...BASE_CONFIG, permissions: { shell: 'ask' } });
			const msg = messageFor(infoSpy, 'Shell');
			expect(msg).toContain('?');
			expect(msg).toContain('timeout: 30s');
		});

		it('shows ✗ and (disabled) when deny', () => {
			printModuleStatus({ ...BASE_CONFIG, permissions: { shell: 'deny' } });
			const msg = messageFor(infoSpy, 'Shell');
			expect(msg).toContain('✗');
			expect(msg).toContain('(disabled)');
		});
	});

	// ---------------------------------------------------------------------------
	// Computer (Screenshot + Mouse/keyboard share the same permission group)
	// ---------------------------------------------------------------------------

	describe('Computer (screenshot + mouse/keyboard)', () => {
		it('shows ✓ on both Screenshot and Mouse/keyboard lines when allow', () => {
			printModuleStatus({ ...BASE_CONFIG, permissions: { computer: 'allow' } });
			expect(messageFor(infoSpy, 'Screenshot')).toContain('✓');
			expect(messageFor(infoSpy, 'MouseKeyboard')).toContain('✓');
		});

		it('shows ? on both lines when ask', () => {
			printModuleStatus({ ...BASE_CONFIG, permissions: { computer: 'ask' } });
			expect(messageFor(infoSpy, 'Screenshot')).toContain('?');
			expect(messageFor(infoSpy, 'MouseKeyboard')).toContain('?');
		});

		it('shows ✗ and (disabled) on both lines when deny', () => {
			printModuleStatus({ ...BASE_CONFIG, permissions: { computer: 'deny' } });
			expect(messageFor(infoSpy, 'Screenshot')).toContain('✗');
			expect(messageFor(infoSpy, 'Screenshot')).toContain('(disabled)');
			expect(messageFor(infoSpy, 'MouseKeyboard')).toContain('✗');
			expect(messageFor(infoSpy, 'MouseKeyboard')).toContain('(disabled)');
		});
	});

	// ---------------------------------------------------------------------------
	// Browser
	// ---------------------------------------------------------------------------

	describe('Browser', () => {
		it('shows ✓ and browser name when allow', () => {
			printModuleStatus({ ...BASE_CONFIG, permissions: { browser: 'allow' } });
			const msg = messageFor(infoSpy, 'Browser');
			expect(msg).toContain('✓');
			expect(msg).toContain('chrome');
		});

		it('shows ? and browser name when ask', () => {
			printModuleStatus({ ...BASE_CONFIG, permissions: { browser: 'ask' } });
			const msg = messageFor(infoSpy, 'Browser');
			expect(msg).toContain('?');
			expect(msg).toContain('chrome');
		});

		it('shows ✗ and (disabled) when deny', () => {
			printModuleStatus({ ...BASE_CONFIG, permissions: { browser: 'deny' } });
			const msg = messageFor(infoSpy, 'Browser');
			expect(msg).toContain('✗');
			expect(msg).toContain('(disabled)');
		});
	});
});
