import {
	agentEvalColumnMappingSchema,
	agentEvalResultStatusSchema,
	agentEvalRunStatusSchema,
	agentEvalVoteSchema,
	createAgentEvalDatasetSchema,
	CreateAgentEvalRatingDto,
	CreateAgentEvalRunDto,
	UpdateAgentEvalDatasetDto,
} from '../agent-evals.schema';

describe('agentEvalColumnMappingSchema', () => {
	it('accepts an input-only mapping', () => {
		expect(agentEvalColumnMappingSchema.safeParse({ input: 'question' }).success).toBe(true);
	});

	it('accepts a full mapping', () => {
		expect(
			agentEvalColumnMappingSchema.safeParse({
				input: 'question',
				expectedOutput: 'answer',
				criteria: 'what to check',
			}).success,
		).toBe(true);
	});

	it('rejects a missing input column', () => {
		expect(agentEvalColumnMappingSchema.safeParse({ expectedOutput: 'answer' }).success).toBe(
			false,
		);
	});

	it('rejects an empty input column', () => {
		expect(agentEvalColumnMappingSchema.safeParse({ input: '' }).success).toBe(false);
	});
});

describe('status / vote enums', () => {
	it('accepts valid run statuses and rejects unknown ones', () => {
		expect(agentEvalRunStatusSchema.safeParse('completed').success).toBe(true);
		expect(agentEvalRunStatusSchema.safeParse('success').success).toBe(false);
	});

	it('accepts valid result statuses and rejects unknown ones', () => {
		expect(agentEvalResultStatusSchema.safeParse('success').success).toBe(true);
		expect(agentEvalResultStatusSchema.safeParse('completed').success).toBe(false);
	});

	it('accepts up/down votes and rejects anything else', () => {
		expect(agentEvalVoteSchema.safeParse('up').success).toBe(true);
		expect(agentEvalVoteSchema.safeParse('down').success).toBe(true);
		expect(agentEvalVoteSchema.safeParse('meh').success).toBe(false);
	});
});

describe('createAgentEvalDatasetSchema', () => {
	const base = {
		name: 'Support cases',
		agentId: 'agent-1',
		columnMapping: { input: 'question', expectedOutput: 'answer' },
	};

	it('accepts a data_table source', () => {
		expect(
			createAgentEvalDatasetSchema.safeParse({
				...base,
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dt-1' },
			}).success,
		).toBe(true);
	});

	it('accepts a google_sheets source', () => {
		expect(
			createAgentEvalDatasetSchema.safeParse({
				...base,
				datasetSource: 'google_sheets',
				datasetRef: {
					credentialId: 'cred-1',
					spreadsheetId: 'sheet-1',
					sheetName: 'Cases',
				},
			}).success,
		).toBe(true);
	});

	it('accepts an explicit null description and columnMapping', () => {
		expect(
			createAgentEvalDatasetSchema.safeParse({
				name: 'Support cases',
				agentId: 'agent-1',
				description: null,
				columnMapping: null,
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dt-1' },
			}).success,
		).toBe(true);
	});

	it('rejects a missing agentId', () => {
		expect(
			createAgentEvalDatasetSchema.safeParse({
				name: 'Support cases',
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dt-1' },
			}).success,
		).toBe(false);
	});

	it('rejects an unknown dataset source', () => {
		expect(
			createAgentEvalDatasetSchema.safeParse({
				...base,
				datasetSource: 'csv',
				datasetRef: { dataTableId: 'dt-1' },
			}).success,
		).toBe(false);
	});
});

describe('UpdateAgentEvalDatasetDto', () => {
	it('accepts a partial metadata patch', () => {
		expect(UpdateAgentEvalDatasetDto.safeParse({ name: 'Renamed' }).success).toBe(true);
	});

	it('accepts an empty patch', () => {
		expect(UpdateAgentEvalDatasetDto.safeParse({}).success).toBe(true);
	});

	it('rejects a non-string name', () => {
		expect(UpdateAgentEvalDatasetDto.safeParse({ name: 42 }).success).toBe(false);
	});
});

describe('CreateAgentEvalRunDto', () => {
	it('accepts an empty body (run current version)', () => {
		expect(CreateAgentEvalRunDto.safeParse({}).success).toBe(true);
	});

	it('accepts a pinned agent version', () => {
		expect(CreateAgentEvalRunDto.safeParse({ agentVersionId: 'v-1' }).success).toBe(true);
	});

	it('rejects an empty agent version', () => {
		expect(CreateAgentEvalRunDto.safeParse({ agentVersionId: '' }).success).toBe(false);
	});
});

describe('CreateAgentEvalRatingDto', () => {
	it('accepts a bare vote', () => {
		expect(CreateAgentEvalRatingDto.safeParse({ vote: 'up' }).success).toBe(true);
	});

	it('accepts a vote with comment and correction', () => {
		expect(
			CreateAgentEvalRatingDto.safeParse({
				vote: 'down',
				comment: 'Wrong tool used',
				correction: { output: 'the expected answer' },
			}).success,
		).toBe(true);
	});

	it('rejects an invalid vote', () => {
		expect(CreateAgentEvalRatingDto.safeParse({ vote: 'maybe' }).success).toBe(false);
	});
});
