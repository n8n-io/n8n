// ---------------------------------------------------------------------------
// Fixed first-build prompts for the latency benchmark
//
// None of them needs a credential, so no setup card suspends the run before
// the first build. Each asks the agent not to ask questions, so the run does
// not stop at a question card before it builds.
// ---------------------------------------------------------------------------

export interface LatencyPrompt {
	id: string;
	text: string;
}

export const LATENCY_PROMPTS: LatencyPrompt[] = [
	{
		id: 'schedule-http',
		text:
			'Build a workflow that runs every day at 8:00. It fetches the current weather for Berlin ' +
			'with an HTTP Request node from ' +
			'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true ' +
			'(no authentication). Then a Set node keeps only the temperature and the wind speed. ' +
			'Do not ask me questions; make reasonable choices.',
	},
	{
		id: 'webhook-if',
		text:
			'Build a workflow with a Webhook trigger that receives a JSON body with an `amount` field. ' +
			'If the amount is greater than 100, respond with {"status":"review"}. Otherwise respond ' +
			'with {"status":"approved"}. Use Respond to Webhook nodes. ' +
			'Do not ask me questions; make reasonable choices.',
	},
	{
		id: 'form-code',
		text:
			'Build a workflow with an n8n Form trigger that asks for a name and an email address. ' +
			'Then a Code node lowercases the email and adds a `submittedAt` timestamp. ' +
			'Use no external services. Do not ask me questions; make reasonable choices.',
	},
];
