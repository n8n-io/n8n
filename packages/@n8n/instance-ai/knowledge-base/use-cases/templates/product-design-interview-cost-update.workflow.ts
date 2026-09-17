// Use case: product-design / Interview Cost Update.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Database tables, run once:
//   CREATE TABLE interviewer_rates (interviewer_id text PRIMARY KEY, hourly_rate numeric,
//     incentive_per_interview numeric, feedback_deadline_hours numeric);
//   CREATE TABLE interview_cost_history (interview_id text PRIMARY KEY, interviewer_id text,
//     cost numeric, incentive numeric, deduction numeric, total numeric);
import { workflow, node, trigger, newCredential, expr } from '@n8n/workflow-sdk';

// The interview tool posts JSON here when an interview ends: { interview_id, interviewer_id,
// duration_minutes, ended_at, feedback_submitted_at }.
const interviewCompleted = trigger({
	type: 'n8n-nodes-base.webhook',
	version: 2.1,
	config: {
		name: 'Interview Completed',
		parameters: { httpMethod: 'POST', path: 'interview-completed', responseMode: 'onReceived' },
		output: [
			{
				body: {
					interview_id: 'INT-1001',
					interviewer_id: 'EMP-42',
					duration_minutes: 45,
					ended_at: '2026-09-10T15:00:00.000Z',
					feedback_submitted_at: '2026-09-10T16:30:00.000Z',
				},
			},
		],
	},
});

// [database] Postgres. Swap for MySQL, Supabase or MongoDB: replace this node and the
// insert node below. It reads $json.body.interviewer_id. The next node reads
// $json.hourly_rate, $json.incentive_per_interview and $json.feedback_deadline_hours.
const getInterviewerRates = node({
	type: 'n8n-nodes-base.postgres',
	version: 2.7,
	config: {
		name: 'Get Interviewer Rates',
		credentials: { postgres: newCredential('Postgres account') },
		parameters: {
			operation: 'executeQuery',
			query:
				'SELECT hourly_rate, incentive_per_interview, feedback_deadline_hours FROM interviewer_rates WHERE interviewer_id = $1',
			options: {
				queryReplacement: expr('{{ $json.body.interviewer_id }}'),
			},
		},
		output: [{ hourly_rate: 40, incentive_per_interview: 5, feedback_deadline_hours: 24 }],
	},
});

// Calculates the interviewer cost, incentive and any deduction for late feedback.
const calculateCost = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Calculate Cost',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'interview_id',
						value: expr("{{ $('Interview Completed').item.json.body.interview_id }}"),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'interviewer_id',
						value: expr("{{ $('Interview Completed').item.json.body.interviewer_id }}"),
						type: 'string',
					},
					{
						id: 'a3',
						name: 'cost',
						value: expr(
							"{{ Math.round((Number($json.hourly_rate) || 0) * (Number($('Interview Completed').item.json.body.duration_minutes) || 0) / 60 * 100) / 100 }}",
						),
						type: 'number',
					},
					{
						id: 'a4',
						name: 'incentive',
						value: expr(
							'{{ Math.round((Number($json.incentive_per_interview) || 0) * 100) / 100 }}',
						),
						type: 'number',
					},
					{
						id: 'a5',
						name: 'deduction',
						value: expr(
							"{{ Math.round((DateTime.fromISO($('Interview Completed').item.json.body.feedback_submitted_at).diff(DateTime.fromISO($('Interview Completed').item.json.body.ended_at), 'hours').hours > (Number($json.feedback_deadline_hours) || 0) ? (Number($json.incentive_per_interview) || 0) * 0.5 : 0) * 100) / 100 }}",
						),
						type: 'number',
					},
					{
						id: 'a6',
						name: 'total',
						value: expr(
							"{{ Math.round((((Number($json.hourly_rate) || 0) * (Number($('Interview Completed').item.json.body.duration_minutes) || 0) / 60) + (Number($json.incentive_per_interview) || 0) - (DateTime.fromISO($('Interview Completed').item.json.body.feedback_submitted_at).diff(DateTime.fromISO($('Interview Completed').item.json.body.ended_at), 'hours').hours > (Number($json.feedback_deadline_hours) || 0) ? (Number($json.incentive_per_interview) || 0) * 0.5 : 0)) * 100) / 100 }}",
						),
						type: 'number',
					},
				],
			},
		},
	},
});

// [database] Postgres: inserts one cost history row per interview, skipping if it
// already exists. It reads $json.interview_id, $json.interviewer_id, $json.cost,
// $json.incentive, $json.deduction and $json.total.
const insertCostHistory = node({
	type: 'n8n-nodes-base.postgres',
	version: 2.7,
	config: {
		name: 'Insert Cost History',
		credentials: { postgres: newCredential('Postgres account') },
		parameters: {
			operation: 'executeQuery',
			query: `INSERT INTO interview_cost_history (interview_id, interviewer_id, cost, incentive, deduction, total)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (interview_id) DO NOTHING`,
			options: {
				queryReplacement: expr(
					'{{ $json.interview_id }},{{ $json.interviewer_id }},{{ $json.cost }},{{ $json.incentive }},{{ $json.deduction }},{{ $json.total }}',
				),
			},
		},
	},
});

export default workflow('id', 'Interview Cost Update')
	.add(interviewCompleted)
	.to(getInterviewerRates)
	.to(calculateCost)
	.to(insertCostHistory);
