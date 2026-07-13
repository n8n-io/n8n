import { credentialResumeSchema, questionsResumeSchema } from '../agent-interaction.schema';
import { AgentBuildResumeDto } from '../dto';

describe('AgentBuildResumeDto', () => {
	const base = { runId: 'run-1', toolCallId: 'tc-1' };

	it('does not strip answers from a questions-card resume', () => {
		const resumeData = {
			approved: true,
			answers: [{ questionId: 'q1', selectedOptions: ['a'] }],
		};

		const result = AgentBuildResumeDto.safeParse({ ...base, resumeData });

		expect(result.success).toBe(true);
		if (!result.success) return;

		// The DTO boundary must hand the payload through untouched — validation
		// (and any stripping of unrecognized keys) is each tool's own job via
		// `.resume(schema)`, not a shared union at the DTO layer.
		expect(result.data.resumeData).toEqual(resumeData);

		// Prove it also survives the tool layer's own validator intact.
		const parsedByTool = questionsResumeSchema.parse(result.data.resumeData);
		expect(parsedByTool.answers).toEqual(resumeData.answers);
	});

	it('still allows a plain credential-card approval to resolve as approved', () => {
		const resumeData = { approved: true };

		const result = AgentBuildResumeDto.safeParse({ ...base, resumeData });

		expect(result.success).toBe(true);
		if (!result.success) return;

		const parsedByTool = credentialResumeSchema.parse(result.data.resumeData);
		expect(parsedByTool).toEqual(resumeData);
	});
});
