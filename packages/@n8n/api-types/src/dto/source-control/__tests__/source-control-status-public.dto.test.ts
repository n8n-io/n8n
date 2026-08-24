import { SourceControlStatusPublicDto } from '../source-control-status-public.dto';

describe('SourceControlStatusPublicDto', () => {
	const fileFixture = {
		file: 'workflows/1.json',
		id: '1',
		name: 'Workflow 1',
		type: 'workflow',
		status: 'modified',
		location: 'local',
		conflict: false,
		updatedAt: '2024-01-01T00:00:00.000Z',
	};

	test('validates an empty page', () => {
		const result = SourceControlStatusPublicDto.safeParse({ data: [], nextCursor: null });
		expect(result.success).toBe(true);
	});

	test('validates a page with files and a next cursor', () => {
		const result = SourceControlStatusPublicDto.safeParse({
			data: [fileFixture],
			nextCursor: 'abc123',
		});
		expect(result.success).toBe(true);
	});

	test('rejects a file missing required fields', () => {
		const { location, ...withoutLocation } = fileFixture;
		const result = SourceControlStatusPublicDto.safeParse({
			data: [withoutLocation],
			nextCursor: null,
		});
		expect(result.success).toBe(false);
	});

	test('rejects a missing nextCursor', () => {
		const result = SourceControlStatusPublicDto.safeParse({ data: [] });
		expect(result.success).toBe(false);
	});
});
