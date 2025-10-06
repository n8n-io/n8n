import './matchers';

vi.mock('node:child_process');
vi.mock('@clack/prompts', () => ({
	intro: vi.fn(),
	outro: vi.fn(),
	cancel: vi.fn(),
	note: vi.fn(),
	log: {
		success: vi.fn(),
		warning: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
	},
	spinner: vi.fn(() => ({
		start: vi.fn(),
		stop: vi.fn(),
		message: vi.fn(),
	})),
	confirm: vi.fn(),
	text: vi.fn(),
	select: vi.fn(),
	isCancel: vi.fn(),
}));

vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
	throw new Error(`EEXIT: ${code ?? 0}`);
});
