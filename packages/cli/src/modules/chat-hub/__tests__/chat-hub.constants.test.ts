import { getModelMetadata } from '../chat-hub.constants';

describe('chat-hub.constants getModelMetadata', () => {
	it('does not return */* for the default LLM modalities', () => {
		// Pass an unknown model so it falls through to DEFAULT_INTERNAL_METADATA
		// (which historically included 'file' and resolved to '*/*').
		const meta = getModelMetadata('openai', 'unknown-model-xyz');
		expect(meta.allowedFilesMimeTypes).not.toBe('*/*');
		expect(meta.allowedFilesMimeTypes).not.toBe('');
	});

	it('includes parseable formats when default modalities apply', () => {
		const meta = getModelMetadata('openai', 'unknown-model-xyz');
		expect(meta.allowedFilesMimeTypes).toContain('application/pdf');
		expect(meta.allowedFilesMimeTypes).toContain('text/csv');
		expect(meta.allowedFilesMimeTypes).toContain(
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		);
		expect(meta.allowedFilesMimeTypes).toContain(
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		);
	});

	it('still allows image/* when default modalities apply', () => {
		const meta = getModelMetadata('openai', 'unknown-model-xyz');
		expect(meta.allowedFilesMimeTypes).toContain('image/*');
	});

	it('does not include video/* or audio/* unless the modality is declared', () => {
		// Anthropic Claude declares ['text', 'image'] — never file/audio/video.
		const meta = getModelMetadata('anthropic', 'claude-opus-4-6');
		expect(meta.allowedFilesMimeTypes).toContain('image/*');
		expect(meta.allowedFilesMimeTypes).not.toContain('video/*');
		expect(meta.allowedFilesMimeTypes).not.toContain('audio/*');
	});

	it('does not include common unsupported binaries (zip, exe, mp4)', () => {
		const meta = getModelMetadata('openai', 'unknown-model-xyz');
		expect(meta.allowedFilesMimeTypes).not.toContain('application/zip');
		expect(meta.allowedFilesMimeTypes).not.toContain('application/x-msdownload');
		expect(meta.allowedFilesMimeTypes).not.toContain('video/mp4');
	});
});
