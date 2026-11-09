import { PublishAgentDto, UpdateAgentVersionDto } from '../dto';

describe.each([PublishAgentDto, UpdateAgentVersionDto])('Agent version metadata', (dto) => {
	it('accepts optional labels and explicit clearing', () => {
		expect(dto.safeParse({}).success).toBe(true);
		expect(dto.safeParse({ name: null, description: null }).success).toBe(true);
		expect(dto.parse({ name: '  Release 1  ', description: 'Release notes' })).toMatchObject({
			name: 'Release 1',
			description: 'Release notes',
		});
	});
	it.each([{ name: 'x'.repeat(129) }, { description: 'x'.repeat(2049) }])(
		'enforces workflow metadata limits',
		(input) => {
			expect(dto.safeParse(input).success).toBe(false);
		},
	);
});
