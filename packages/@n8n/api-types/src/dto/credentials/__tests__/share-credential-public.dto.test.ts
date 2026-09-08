import { ShareCredentialPublicDto } from '../share-credential-public.dto';

describe('ShareCredentialPublicDto', () => {
	describe('should pass validation', () => {
		it('with a list of project ids', () => {
			const result = ShareCredentialPublicDto.safeParse({
				shareWithIds: ['project-1', 'project-2'],
			});

			expect(result.success).toBe(true);
			expect(result.data?.shareWithIds).toEqual(['project-1', 'project-2']);
		});

		it('with an empty list, which unshares from every project', () => {
			const result = ShareCredentialPublicDto.safeParse({ shareWithIds: [] });

			expect(result.success).toBe(true);
			expect(result.data?.shareWithIds).toEqual([]);
		});
	});

	describe('should fail validation', () => {
		test.each([
			{ name: 'missing shareWithIds', data: {} },
			{ name: 'shareWithIds not an array', data: { shareWithIds: 'project-1' } },
			{ name: 'non-string entries', data: { shareWithIds: [1, 2] } },
			{ name: 'empty string entries', data: { shareWithIds: ['project-1', ''] } },
			{ name: 'null shareWithIds', data: { shareWithIds: null } },
		])('$name', ({ data }) => {
			const result = ShareCredentialPublicDto.safeParse(data);

			expect(result.success).toBe(false);
		});
	});
});
