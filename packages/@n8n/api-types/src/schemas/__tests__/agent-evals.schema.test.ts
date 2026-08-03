import {
	agentEvalColumnMappingSchema,
	agentEvalDraftCaseSchema,
	agentEvalResultStatusSchema,
	agentEvalRunStatusSchema,
	agentEvalVoteSchema,
	createAgentEvalDatasetSchema,
	CreateAgentEvalRatingDto,
	CreateAgentEvalRunDto,
	GenerateDraftCasesOptionsDto,
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
				correction: { finalText: 'the expected answer' },
			}).success,
		).toBe(true);
	});

	it('keeps extra correction keys alongside the edited answer', () => {
		const parsed = CreateAgentEvalRatingDto.safeParse({
			vote: 'down',
			correction: { finalText: 'the expected answer', fields: { tone: 'formal' }, score: 3 },
		});

		expect(parsed.success).toBe(true);
		expect(parsed.data?.correction).toEqual({
			finalText: 'the expected answer',
			fields: { tone: 'formal' },
			score: 3,
		});
	});

	it('rejects a correction with a non-JSON leaf', () => {
		expect(
			CreateAgentEvalRatingDto.safeParse({
				vote: 'down',
				correction: { finalText: 'ok', extra: () => 'not json' },
			}).success,
		).toBe(false);
	});

	// A correction with no readable edited answer is what calibration would choke on.
	it.each([{}, { output: 'wrong key' }, { finalText: null }, { finalText: '   ' }])(
		'rejects a correction without a usable finalText: %j',
		(correction) => {
			expect(CreateAgentEvalRatingDto.safeParse({ vote: 'down', correction }).success).toBe(false);
		},
	);

	it('rejects an invalid vote', () => {
		expect(CreateAgentEvalRatingDto.safeParse({ vote: 'maybe' }).success).toBe(false);
	});
});

describe('agentEvalDraftCaseSchema', () => {
	it('accepts a valid draft case', () => {
		expect(
			agentEvalDraftCaseSchema.safeParse({
				input: 'Reset my password',
				whatToCheck: 'Explains steps',
			}).success,
		).toBe(true);
	});

	it('rejects a draft case missing whatToCheck', () => {
		expect(agentEvalDraftCaseSchema.safeParse({ input: 'Reset my password' }).success).toBe(false);
	});
});

describe('GenerateDraftCasesOptionsDto', () => {
	it('accepts an empty options body', () => {
		expect(GenerateDraftCasesOptionsDto.safeParse({}).success).toBe(true);
	});

	it('accepts count and datasetName', () => {
		expect(
			GenerateDraftCasesOptionsDto.safeParse({ count: 6, datasetName: 'Support' }).success,
		).toBe(true);
	});

	it('rejects a non-positive or non-integer count', () => {
		expect(GenerateDraftCasesOptionsDto.safeParse({ count: 0 }).success).toBe(false);
		expect(GenerateDraftCasesOptionsDto.safeParse({ count: 2.5 }).success).toBe(false);
	});
});
