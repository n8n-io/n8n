import type { BaseTextKey } from '@n8n/i18n';
import type {
	AgentCardsConfig,
	AgentIntegrationConfig,
	AgentJsonConfig,
	AgentJsonToolConfig,
	AgentPersonalisation,
	AgentTaskConfig,
} from '@n8n/api-types';

type AgentTemplateGradient = AgentPersonalisation['gradient'];

/**
 * A one-click starter agent template. Selecting one writes a working example
 * onto a blank agent so the user sees something to react to instead of an
 * empty screen. `model` is deliberately absent: the seeded default model stays.
 */
export interface AgentTemplate {
	id: string;
	labelKey: BaseTextKey;
	descriptionKey: BaseTextKey;
	icon: string;
	/** Avatar gradient shown on the option and written onto the agent. */
	gradient: AgentTemplateGradient;
	/** Written onto a blank agent. `model` is never set here. */
	config: {
		name: string;
		instructions: string;
		tools?: AgentJsonToolConfig[];
		/** Draft channel integrations (empty `credentialId`) so the trigger
		 * chips show as highlighted until the user connects a credential.
		 * The trigger types are derived from this list — no separate
		 * `connectedTriggers` field is needed. */
		integrations?: AgentIntegrationConfig[];
		/** Nested agent runtime config (web search, reasoning, etc.). Merged
		 * onto the existing config so a template can enable web search without
		 * wiping other runtime settings. */
		config?: {
			webSearch?: { enabled: boolean; provider?: 'auto' | 'native' | 'brave' | 'searxng' };
		};
		/** Result cards the agent shows in chat: default tone, allowed archetypes, named presets. */
		cards?: AgentCardsConfig;
	};
	/** Scheduled task bodies to create after the agent is persisted. The
	 * backend assigns each task an id and adds the matching `{ type: 'task',
	 * id, enabled }` ref to the config, so the template does not pre-populate
	 * the config's `tasks` array. */
	tasks?: AgentTaskConfig[];
}

/** Distinct from the home-screen suggestion catalog (`v1`). */
export const AGENT_TEMPLATE_SUGGESTIONS_VERSION = 'agent-templates-v1';

/**
 * Demo datasets for the card-first templates below. They live in the
 * instructions so the agent can answer — and show cards — with only a model
 * credential connected; swapping them for a Sheets / CRM / n8n tool is the
 * natural next step once the user likes the shape.
 */
const PIPELINE_DEMO_DATA = `Current pipeline (as of today; USD; stages: Qualified → Proposal → Negotiation → Closed won):
| Deal | Company | Owner | Stage | Value | Close date | Last touch |
| --- | --- | --- | --- | --- | --- | --- |
| Rollout for EMEA | Northwind Traders | Marta | Negotiation | 48,000 | Oct 24 | 2 days ago |
| Platform licence | Contoso | Jakub | Proposal | 36,500 | Nov 7 | yesterday |
| Pilot → paid | Fabrikam | Marta | Negotiation | 22,000 | Oct 17 | today |
| Data team seats | Tailspin Toys | Ola | Qualified | 9,800 | Nov 28 | 6 days ago |
| Renewal + upsell | Adventure Works | Jakub | Proposal | 31,200 | Oct 31 | 3 days ago |
| Agency bundle | Wide World Importers | Ola | Qualified | 14,400 | Dec 12 | 9 days ago |
| Security add-on | Litware | Marta | Closed won | 12,000 | Oct 3 | — |
| Onboarding package | Proseware | Jakub | Closed won | 7,500 | Oct 6 | — |
Last week's open pipeline was 158,000; this week it is 161,900. Target for Q4 closed-won: 120,000 (19,500 closed so far).
Open pipeline by stage, this week vs last week (USD): Qualified 24,200 (last week 31,000) · Proposal 67,700 (last week 60,500) · Negotiation 70,000 (last week 66,500).`;

const SUPPORT_DEMO_DATA = `Open tickets (SLA: first reply within 4h for urgent, 24h otherwise):
| # | Subject | Requester | Priority | Age | Status | Last message |
| --- | --- | --- | --- | --- | --- | --- |
| 1042 | Invoice total doesn't match the PO | anna.kowalska@northwind.example | urgent | 1h 20m | new | "The PO says 4,800 but your invoice #INV-2291 shows 5,100. Can you check before Friday?" |
| 1039 | Can't connect Google Sheets after re-login | tom@fabrikam.example | high | 5h | waiting on us | "Still getting 'invalid_grant' after reconnecting twice." |
| 1037 | Export to CSV missing the date column | priya@contoso.example | normal | 1d 3h | waiting on customer | "Sent you the file with the missing column — let me know if that helps." |
| 1035 | Workflow runs twice on one webhook | dev@tailspin.example | high | 1d 9h | in progress | "Found duplicate executions at 09:14 and 09:14:03." |
| 1031 | How do I share a workflow with a contractor? | sam@litware.example | low | 2d | new | "Just need read access for one person." |
| 1028 | Request: dark mode for the public form | hello@proseware.example | low | 3d | new | "Would love this for our branding." |
| 1022 | Slack notifications stopped on Monday | ops@adventure-works.example | urgent | 4d | waiting on us | "No alerts since Monday 07:00, the channel is still connected." |
SLA this week: 31 tickets replied, 27 within SLA (87%); last week 91%. Median first reply: 2h 10m. Breaches: #1022 (urgent, 4d), #1039 (high, 5h).`;

const WORKFLOW_HEALTH_DEMO_DATA = `Workflow runs for yesterday (00:00–24:00 UTC):
| Workflow | Runs | Succeeded | Failed | Avg duration | Last failure |
| --- | --- | --- | --- | --- | --- |
| Invoice sync (Stripe → Xero) | 212 | 209 | 3 | 4.2s | 22:41 — Xero API 429 Too Many Requests, retried 3× |
| Lead enrichment | 96 | 96 | 0 | 11.8s | — |
| Daily digest email | 1 | 1 | 0 | 38s | — |
| Slack alerts (errors) | 54 | 52 | 2 | 1.1s | 09:14 — Slack channel_not_found for #ops-archive |
| Webhook intake (forms) | 318 | 318 | 0 | 0.6s | — |
| Weekly report (Sheets) | 0 | 0 | 0 | — | not scheduled yesterday |
Totals: 681 runs, 676 succeeded, 5 failed (99.3% success; day before: 99.7%). Hourly failures: 0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,3,0.`;

const TRIP_DESK_DEMO_DATA = `Traveller: Maya Chen (initials MC), Economy.
Flight TA 482, Wed Jun 12: SFO (San Francisco) → JFK (New York), 5h 20m. Scheduled: departs 08:45, arrives 17:05, boards 08:05. Latest from the airline: delayed — departs 09:25, arrives 17:45, boards 08:45. Gate B12, seat 14A, zone 2. Check-in opens 24h before departure.
Meeting after landing: "Launch review", Thu Jun 13, 2:00–3:00 PM Eastern (2026-06-13T14:00:00-04:00 to 2026-06-13T15:00:00-04:00), Google Meet https://meet.google.com/abc-defg-hij, in person at Studio 4, 210 Market St, New York (directions https://maps.google.com/?q=210+Market+St+New+York). Attendees: Maya Chen (going), Leo Park (going), Ava Ruiz (going), Noah Kim (maybe), Iris Hale (going).
New York forecast (°C): Mon sunny 24 (H 26 / L 17) · Tue cloudy 19 (H 21 / L 14) · Wed light rain 16 (H 18 / L 12) · Thu thunderstorms 15 (H 17 / L 11) · Fri sunny 22 (H 25 / L 15). Source: Open-Meteo.`;

/**
 * One scenario that reaches every archetype: the team offsite in Lisbon,
 * Mon 20 – Thu 23 Oct 2026. The same data drives `demo/workflows/offsite-desk.json`,
 * so the workflow (no credentials) and this agent (a model credential) are one
 * experience: ask the same eleven questions, see the same eleven cards.
 */
const OFFSITE_DESK_DEMO_DATA = `Offsite: "Lisbon offsite", Mon 20 – Thu 23 Oct 2026. Organiser and traveller: Ola Nowak (initials ON), Economy. 30 people invited.
Weather, Lisbon (°C, Open-Meteo): Mon sunny 24 (H 26 / L 17) · Tue partly cloudy 22 (H 24 / L 16) · Wed light rain 19 (H 21 / L 15) · Thu cloudy 20 (H 22 / L 14) · Fri sunny 23 (H 25 / L 15).
Flight TP 1251, Mon Oct 20: WAW (Warsaw) → LIS (Lisbon), 4h 00m. Scheduled: departs 06:35, arrives 09:35, boards 05:55. Latest from the airline: delayed — departs 07:15, arrives 10:15, boards 06:35. Gate 23, seat 12C, zone 2. Check-in opens 24h before departure.
Kickoff dinner: Mon Oct 20, 19:30–22:00 Lisbon time (2026-10-20T19:30:00+01:00 to 2026-10-20T22:00:00+01:00) at Cervejaria Ramiro, Av. Almirante Reis 1H, Lisbon (directions https://maps.google.com/?q=Cervejaria+Ramiro+Lisbon; calendar https://calendar.google.com/). 24 going. Attendees to show: Ola Nowak (going), Marta Kowalska (going), Jonas Weber (going), Priya Raman (maybe), Luca Bianchi (going), Ana Costa (invited).
Budget (EUR), planned per day as Flights / Hotel / Food / Activities: Mon 6200 / 1900 / 1100 / 400 · Tue 0 / 1900 / 1400 / 900 · Wed 0 / 1900 / 1300 / 1600 · Thu 5900 / 0 / 600 / 0. Planned total 25,100 (€25.1k); budget 26,000; per person €837. Paid so far: flights and hotel only (Mon 6200 / 1900 · Tue 1900 · Wed 1900 · Thu 5900) = 17,800 (€17.8k); remaining to pay €7.3k.
Headcount: 24 of 30 confirmed (+6 since last week): Engineering 11, Product 7, Design 4, Ops 2. Flights booked: 19 (+9 since last week): from Warsaw 9, Berlin 6, London 4.
Ola's morning run today: avg heart rate 148 bpm, max 171 bpm, 5.2 km, pace 5:41 /km. Resting: 58 bpm, HRV 62 ms, sleep 7h 20m, recovery 84%.
Agenda email: sent to offsite-lisbon@n8n.io, subject "Lisbon offsite — agenda & logistics", body "Hi all, here's the final agenda for Oct 20–23. Flights, the hotel and Monday's dinner are in the attached PDF.", attachment lisbon-agenda.pdf, Gmail link https://mail.google.com/.
Slack: channel #offsite-lisbon, post "Kickoff dinner tonight 19:30 at Cervejaria Ramiro (Av. Almirante Reis 1H). Metro: Intendente. See you there 🦐", thread https://slack.com/.
Attendee sheet "Offsite 2026 · Attendees" (Google Sheets, https://docs.google.com/spreadsheets/), columns Name, Team, From, Hotel; latest row added: Marta Kowalska, Product, Warsaw, Memmo Alfama; 25 rows now.
Checklist (Notion, https://www.notion.so/), still open: Book the Tuesday workshop room (Venue · due Wed, Ola) · Collect dietary needs (Form · 6 missing, Marta) · Print name badges (Print · due Fri, Jonas) · Confirm the airport shuttle (Transport · due Thu, Priya). 4 open, 11 done.
Hotel: Memmo Alfama, Tv. Merceeiras 27, Lisbon. Check-in Mon Oct 20 15:00, check-out Thu Oct 23 11:00, 14 doubles + 2 twins, booking ref MA-48213, breakfast 07:30–10:30. Cover photo: https://images.unsplash.com/photo-1585208798174-6cedd86e019a?auto=format&fit=crop&w=800&q=70 (Lisbon tram).`;

export const AGENT_TEMPLATES: readonly AgentTemplate[] = [
	{
		id: 'pipeline-pulse',
		labelKey: 'agents.builder.templates.pipelinePulse.label',
		descriptionKey: 'agents.builder.templates.pipelinePulse.description',
		icon: 'trending-up',
		gradient: { from: '#C2410C', to: '#F59E0B', angle: 150, fromStop: 6, toStop: 94 },
		config: {
			name: 'Pipeline Pulse',
			instructions: `You are the sales pipeline assistant for a small B2B team. People ask you how the pipeline is doing, which deals need attention, what closes this month, and about single deals. Answer in one or two plain sentences and show the data in a card — a number when they ask "how much", a short table when they ask "which deals", a key/value card for one deal. Mention the owner and close date when they matter. Flag deals with no touch in more than 5 days. Never invent deals or figures; the data below is the only source of truth. Values are USD.\n\n${PIPELINE_DEMO_DATA}`,
			cards: {
				tone: 'terracotta',
				presets: [
					{
						name: 'Pipeline total',
						type: 'metric',
						useWhen:
							'the user asks how the pipeline is doing, how much is open, or how this week compares',
						fields:
							'value: open pipeline total; delta: change vs last week; breakdown: value per stage; label: "open pipeline"; switcher: segmented at the top with options "This week" / "Last week" and a variant for last week carrying its value, delta and breakdown so the user can flip between them',
					},
					{
						name: 'Pipeline by owner',
						type: 'chart',
						useWhen: 'the user asks who owns what, or how the pipeline splits by person or stage',
						fields:
							'kind: stacked; series: one per owner (Marta, Jakub, Ola); columns: one per open stage (Qualified, Proposal, Negotiation) with each owner\'s value; total: open pipeline; totalLabel: "USD"; facts: deals count, biggest deal, Q4 target progress',
					},
					{
						name: 'Top deals',
						type: 'records',
						useWhen: 'the user asks which deals close soon, need attention, or belong to someone',
						fields:
							'columns: Deal, Company, Stage, Value (≤4); rows: the matching deals (≤5); total: count of matches; operation: read; target: "Pipeline"',
					},
					{
						name: 'Deal detail',
						type: 'keyValue',
						tone: 'paper',
						useWhen: 'the user asks about one specific deal',
						fields: 'pairs: Company, Owner, Stage, Value, Close date, Last touch',
					},
				],
			},
		},
	},
	{
		id: 'support-inbox-triage',
		labelKey: 'agents.builder.templates.supportInboxTriage.label',
		descriptionKey: 'agents.builder.templates.supportInboxTriage.description',
		icon: 'life-buoy',
		gradient: { from: '#6D28D9', to: '#C4B5FD', angle: 135, fromStop: 0, toStop: 100 },
		config: {
			name: 'Support Inbox Triage',
			instructions: `You are the support triage assistant for a SaaS team. People ask you what is waiting in the inbox, what is urgent, whether the team is inside its SLA, and about single tickets. Answer in one or two plain sentences and show the data in a card — a list for "what's waiting", an email card for one ticket (the customer's last message is the preview), a number for SLA questions. Order by priority, then age. Call out SLA breaches explicitly. Never invent tickets or figures; the data below is the only source of truth.\n\n${SUPPORT_DEMO_DATA}`,
			cards: {
				tone: 'lavender',
				presets: [
					{
						name: 'Open tickets',
						type: 'list',
						useWhen: "the user asks what's waiting, what's urgent, or what to pick up next",
						fields:
							'items: title = "#id · subject", subtitle = requester + status, meta = priority or age (≤5 items); total: open count',
					},
					{
						name: 'Ticket',
						type: 'email',
						tone: 'paper',
						useWhen: 'the user asks about one ticket',
						fields:
							'direction: received; from: requester; to: ["support"]; subject: the ticket subject; preview: the last customer message; labels: priority and status',
					},
					{
						name: 'SLA health',
						type: 'metric',
						useWhen: 'the user asks about SLA, response times, or how the week is going',
						fields:
							'value: % replied within SLA; delta: vs last week; breakdown: within SLA vs breached; label: "within SLA this week"; switcher: segmented "This week" / "Last week" with a last-week variant (91%, no delta)',
					},
				],
			},
		},
	},
	{
		id: 'workflow-health-reporter',
		labelKey: 'agents.builder.templates.workflowHealthReporter.label',
		descriptionKey: 'agents.builder.templates.workflowHealthReporter.description',
		icon: 'chart-bar',
		gradient: { from: '#166534', to: '#4ADE80', angle: 160, fromStop: 4, toStop: 96 },
		config: {
			name: 'Workflow Health Reporter',
			instructions: `You are the operations assistant watching a team's n8n workflows. People ask you how yesterday's runs went, what failed and why, and about a single workflow. Answer in one or two plain sentences and show the data in a card — a number with a breakdown for "how did it go", a list for failures, a key/value card for one workflow. Name the cause of a failure when the data has it and suggest the obvious next step in one short clause. Never invent runs or causes; the data below is the only source of truth.\n\n${WORKFLOW_HEALTH_DEMO_DATA}`,
			cards: {
				tone: 'forest',
				presets: [
					{
						name: 'Runs yesterday',
						type: 'metric',
						useWhen: 'the user asks how the runs went, how healthy things are, or for the daily summary',
						fields:
							'value: success rate or total runs; delta: vs the day before; breakdown: succeeded vs failed; trend: hourly failures; label: "runs yesterday"',
					},
					{
						name: 'Runs by workflow',
						type: 'chart',
						useWhen: 'the user asks which workflows ran, how the load splits, or where the failures sit',
						fields:
							'kind: stacked; series: Succeeded (#1EBB26) and Failed (#EC4A4A); columns: one per workflow that ran (short label ≤12 chars) with [succeeded, failed]; total: total runs; totalLabel: "runs"; facts: success rate, failed count, slowest workflow',
					},
					{
						name: 'Failed runs',
						type: 'list',
						tone: 'graphite',
						useWhen: 'the user asks what failed or what needs attention',
						fields:
							'items: title = workflow name, subtitle = cause, meta = time or count; status: error; total: failed count',
					},
					{
						name: 'Workflow detail',
						type: 'keyValue',
						useWhen: 'the user asks about one workflow',
						fields: 'pairs: Runs, Succeeded, Failed, Avg duration, Last failure',
					},
				],
			},
		},
	},
	{
		id: 'trip-desk',
		labelKey: 'agents.builder.templates.tripDesk.label',
		descriptionKey: 'agents.builder.templates.tripDesk.description',
		icon: 'paper-plane',
		gradient: { from: '#1D4ED8', to: '#60A5FA', angle: 155, fromStop: 4, toStop: 96 },
		config: {
			name: 'Trip Desk',
			instructions: `You are a travel desk assistant for one traveller. People ask you about the flight, the meeting after landing and the weather at the destination. Answer in one or two plain sentences and show the data in a card: a boarding pass for the flight (with a switch between the scheduled and the latest times), an event card for the meeting (with Join call and Decline), a weather card with one tab per day for the forecast. Never invent bookings, times or temperatures; the data below is the only source of truth.\n\n${TRIP_DESK_DEMO_DATA}`,
			cards: {
				tone: 'sky',
				presets: [
					{
						name: 'Boarding pass',
						type: 'ticket',
						tone: 'paper',
						useWhen: 'the user asks about the flight, the gate, the seat, boarding or whether it is on time',
						fields:
							'reference: "TA 482 · Wed, Jun 12"; mode: flight; from / to: code, city, time; duration; badge: "On time" (ok) or "Delayed" (warn); facts: Gate, Seat, Boards, Zone; holder: name, "Economy", initials; switcher: control "switch", label "Latest", options "scheduled" / "latest" with the latest variant carrying the delayed badge and times; actions: one event "Check in" with pendingLabel "Checking in", doneLabel "Checked in", name "check-in"',
					},
					{
						name: 'Meeting',
						type: 'event',
						tone: 'paper',
						useWhen: 'the user asks about the meeting, where to go, who is coming or how to join',
						fields:
							'startsAt / endsAt as ISO with the Eastern offset; platform "Google Meet"; location; locationHref (Directions); joinHref; attendees with status; actions: [{ label "Join call", href joinHref, icon "video" }, { label "Decline", kind "toggle", doneLabel "Declined", destructive true, name "decline" }]',
					},
					{
						name: 'Forecast',
						type: 'weather',
						useWhen: 'the user asks about the weather, what to pack, or a specific day',
						fields:
							'location "New York"; the asked (or first) day as the base: eyebrow weekday, temperature, condition, icon (sun / cloud / rain / thunder), high, low; sources: Open-Meteo; switcher: bottom tabs, one option per day (key mon…fri, label Mon…Fri, icon = that day\'s icon), variants: one per day with eyebrow, temperature, condition, icon, high, low',
					},
				],
			},
		},
	},
	{
		id: 'offsite-desk',
		labelKey: 'agents.builder.templates.offsiteDesk.label',
		descriptionKey: 'agents.builder.templates.offsiteDesk.description',
		icon: 'map-pin',
		gradient: { from: '#0F766E', to: '#F59E0B', angle: 160, fromStop: 8, toStop: 92 },
		config: {
			name: 'Offsite Desk',
			instructions: `You are the desk for one team offsite in Lisbon. People ask about the weather, the flight, the kickoff dinner, the budget, who has confirmed, the morning run, the agenda email, the Slack post, the attendee sheet, the checklist and the hotel. Answer in one or two plain sentences and show the data as a card — always exactly one card per answer, chosen from the presets. When someone asks what you can do, or says "tour", list the eleven questions above in one short message without a card. Never invent bookings, times, amounts or temperatures; the data below is the only source of truth.\n\n${OFFSITE_DESK_DEMO_DATA}`,
			cards: {
				tone: 'sky',
				presets: [
					{
						name: 'Forecast',
						type: 'weather',
						useWhen: 'the user asks about the weather in Lisbon, what to pack, or a specific day',
						fields:
							'location "Lisbon, Portugal"; the asked (or first) day as the base: eyebrow weekday, temperature, condition, icon (sun / partly-cloudy / rain / cloud), high, low; sources: Open-Meteo; switcher: bottom tabs, one option per day (key mon…fri, label Mon…Fri, icon = that day\'s icon), variants: one per day with eyebrow, temperature, condition, icon, high, low',
					},
					{
						name: 'Boarding pass',
						type: 'ticket',
						tone: 'paper',
						useWhen: 'the user asks about the flight, the gate, the seat, boarding or whether it is on time',
						fields:
							'reference "TP 1251 · Mon, Oct 20"; mode flight; from WAW Warsaw / to LIS Lisbon with times; duration; badge "On time" (ok) or "Delayed" (warn); facts Gate, Seat, Boards, Zone; holder name, "Economy", initials ON; switcher control "switch", label "Latest", options "scheduled" / "latest", the latest variant carrying the delayed badge and times; actions: one event "Check in" with pendingLabel "Checking in", doneLabel "Checked in", name "check-in"',
					},
					{
						name: 'Kickoff dinner',
						type: 'event',
						tone: 'terracotta',
						useWhen: 'the user asks about the dinner, where to go on Monday evening, who is coming',
						fields:
							'title "Kickoff dinner"; startsAt / endsAt as ISO with the +01:00 offset; location; locationHref (Directions); attendees with status; attendeeCount 24; actions: [{ label "Add to calendar", href calendar link, icon "calendar" }, { label "Decline", kind "toggle", doneLabel "Declined", destructive true, name "decline" }]',
					},
					{
						name: 'Budget',
						type: 'chart',
						tone: 'forest',
						useWhen: 'the user asks about the budget, the cost, what has been paid',
						fields:
							'kind stacked; series Flights, Hotel, Food, Activities; columns Mon…Thu with one value per series; total "€25.1k", totalLabel "Planned", range "Oct 20 – 23"; facts: Budget €26k, Per person €837, Remaining €7.3k; switcher: segmented, placement top, options "planned" (label "Planned") / "paid" (label "Paid"); the paid variant: columns with only flights and hotel, total "€17.8k", totalLabel "Paid so far"',
					},
					{
						name: 'Headcount',
						type: 'metric',
						tone: 'aubergine',
						useWhen: 'the user asks how many people confirmed, who is coming, or how many flights are booked',
						fields:
							'value "24", label "of 30 confirmed", delta +6 up "since last week", breakdown per team; switcher: segmented, placement top, options "people" (label "People") / "flights" (label "Flights"); the flights variant: value "19", label "flights booked", delta +9 up, breakdown per origin city',
					},
					{
						name: 'Morning run',
						type: 'pulse',
						tone: 'terracotta',
						useWhen: 'the user asks about the run, the heart rate or how Ola is doing today',
						fields:
							'value 148, unit "bpm", label "Avg heart rate", section "Run", stats: Distance 5.2 km, Pace 5:41 /km, Max 171 bpm; switcher: menu, label "Range", options "run" (label "Run") / "resting" (label "Resting"); the resting variant: value 58, label "Resting heart rate", stats HRV 62 ms, Sleep 7h 20m, Recovery 84 %',
					},
					{
						name: 'Agenda email',
						type: 'email',
						useWhen: 'the user asks to send the agenda or whether it went out',
						fields:
							'direction sent; to the offsite list; subject; preview from the body; attachments; status success, statusLabel "Sent"; nodeType n8n-nodes-base.gmail; actions: one link "Open in Gmail" with icon "external-link"',
					},
					{
						name: 'Slack post',
						type: 'message',
						useWhen: 'the user asks to post the dinner details or tell the channel something',
						fields:
							'channel slack; to "#offsite-lisbon"; text; author "Offsite desk"; status success, statusLabel "Posted"; nodeType n8n-nodes-base.slack; actions: [{ label "Open thread", href, icon "message" }, { label "Pin", kind "toggle", name "pin", doneLabel "Pinned", icon "star" }]',
					},
					{
						name: 'Attendee sheet',
						type: 'records',
						tone: 'forest',
						useWhen: 'the user asks to add someone to the attendee list or sheet',
						fields:
							'target "Offsite 2026 · Attendees"; operation append; columns Name, Team, From, Hotel; rows: the row added; total 25; status success, statusLabel "Added"; nodeType n8n-nodes-base.googleSheets; actions: one link "Open sheet" with icon "external-link"',
					},
					{
						name: 'Checklist',
						type: 'list',
						tone: 'lavender',
						useWhen: 'the user asks what is still open, what is left to do, or for the checklist',
						fields:
							'items: title, subtitle (area · due), meta (owner); total 4; actions: one link "Open checklist" with icon "external-link"',
					},
					{
						name: 'Hotel',
						type: 'keyValue',
						tone: 'paper',
						useWhen: 'the user asks about the hotel, check-in, the rooms or the booking',
						fields:
							'title "Hotel · Memmo Alfama"; pairs: Check-in, Check-out, Rooms, Booking ref, Address, Breakfast; cover: the Lisbon tram photo with alt "Lisbon"',
					},
				],
			},
		},
	},
	{
		id: 'morning-news-brief',
		labelKey: 'agents.builder.templates.morningNewsBrief.label',
		descriptionKey: 'agents.builder.templates.morningNewsBrief.description',
		icon: 'sun',
		gradient: { from: '#F5A524', to: '#FF5A1F', angle: 160, fromStop: 8, toStop: 92 },
		config: {
			name: 'Morning News Brief',
			instructions:
				'You are a news brief agent. Every morning at 9am, search the web for today’s top headlines and compile a concise summary. For each story include a headline, a one-sentence summary, and a source link. Limit the brief to five stories.',
			config: {
				webSearch: { enabled: true, provider: 'native' },
			},
		},
		tasks: [
			{
				name: 'Morning news brief',
				objective:
					'Search the web for today’s top headlines and compile a concise summary. For each story include a headline, a one-sentence summary, and a source link. Limit the brief to five stories.',
				cronExpression: '0 9 * * *',
			},
		],
	},
	{
		id: 'process-incoming-emails',
		labelKey: 'agents.builder.templates.processIncomingEmails.label',
		descriptionKey: 'agents.builder.templates.processIncomingEmails.description',
		icon: 'mail',
		gradient: { from: '#2563EB', to: '#7C3AED', angle: 135, fromStop: 0, toStop: 100 },
		config: {
			name: 'Process Incoming Emails',
			instructions:
				'You are an email processing agent. Read new emails from Gmail, identify action items, and update the user’s Google Calendar with any meetings, deadlines, or follow-ups mentioned. Summarize each email and flag urgent items.',
			tools: [
				{
					type: 'node',
					name: 'Gmail',
					description: 'Read and send emails through Gmail.',
					node: {
						nodeType: 'n8n-nodes-base.gmail',
						nodeTypeVersion: 2,
						// `getAll` is valid with no extra fields. The default
						// `send` operation requires recipient, subject, and body,
						// and an invalid tool blocks every chat send.
						nodeParameters: { resource: 'message', operation: 'getAll' },
						credentials: { gmailOAuth2: { id: '', name: 'gmailOAuth2' } },
					},
				},
				{
					type: 'node',
					name: 'Google Calendar',
					description: 'Create and update calendar events.',
					node: {
						nodeType: 'n8n-nodes-base.googleCalendar',
						nodeTypeVersion: 1,
						// `create` requires start and end. Runtime values keep the
						// tool valid before a calendar is connected.
						nodeParameters: {
							resource: 'event',
							operation: 'create',
							start: "={{ $fromAI('start', 'Event start time', 'string') }}",
							end: "={{ $fromAI('end', 'Event end time', 'string') }}",
						},
						credentials: {
							googleCalendarOAuth2Api: { id: '', name: 'googleCalendarOAuth2Api' },
						},
					},
				},
			],
		},
	},
	{
		id: 'qualify-new-leads',
		labelKey: 'agents.builder.templates.qualifyNewLeads.label',
		descriptionKey: 'agents.builder.templates.qualifyNewLeads.description',
		icon: 'users',
		gradient: { from: '#059669', to: '#84CC16', angle: 120, fromStop: 4, toStop: 88 },
		config: {
			name: 'Qualify New Leads',
			instructions:
				'You are a lead qualification agent. Score new leads from the CRM based on their profile, activity, and engagement. Route high-scoring leads to sales for immediate follow-up, and nurture low-scoring leads with relevant content.',
		},
	},
	{
		id: 'propose-meeting-times',
		labelKey: 'agents.builder.templates.proposeMeetingTimes.label',
		descriptionKey: 'agents.builder.templates.proposeMeetingTimes.description',
		icon: 'calendar',
		gradient: { from: '#0F766E', to: '#2DD4BF', angle: 150, fromStop: 4, toStop: 96 },
		config: {
			name: 'Propose Meeting Times',
			instructions:
				'You are a scheduling agent. Find open slots on the user’s Google Calendar and suggest a few meeting times. Match the requested duration and time window. Do not book a meeting until the user confirms a time.',
			tools: [
				{
					type: 'node',
					name: 'Google Calendar',
					description: 'Find open slots on Google Calendar.',
					node: {
						nodeType: 'n8n-nodes-base.googleCalendar',
						nodeTypeVersion: 1.3,
						// Availability needs an interval. Runtime values keep the
						// tool valid before a calendar is connected.
						nodeParameters: {
							resource: 'calendar',
							operation: 'availability',
							timeMin: "={{ $fromAI('timeMin', 'Start of the interval to check', 'string') }}",
							timeMax: "={{ $fromAI('timeMax', 'End of the interval to check', 'string') }}",
						},
						credentials: {
							googleCalendarOAuth2Api: { id: '', name: 'googleCalendarOAuth2Api' },
						},
					},
				},
			],
		},
	},
];

/**
 * A blank agent: no instructions, no tools, and no channel integrations.
 * `name` and `model` are ignored — both are seeded on every new agent, so a
 * default name or model does not count as content the user would lose by
 * applying a template.
 */
export function isAgentConfigBlank(config: AgentJsonConfig): boolean {
	return (
		config.instructions.trim() === '' &&
		(config.tools?.length ?? 0) === 0 &&
		(config.integrations?.length ?? 0) === 0
	);
}

/**
 * Returns the config with the template written onto it, or `null` when the
 * agent already has content (instructions or tools). `name` is only replaced
 * while it still equals `defaultName` (the seeded "New Agent"), so a renamed
 * agent keeps its name. The template icon and gradient replace the
 * personalisation. `model` and every other field are preserved.
 */
export function applyAgentTemplate(
	config: AgentJsonConfig,
	template: AgentTemplate,
	defaultName: string,
): AgentJsonConfig | null {
	if (!isAgentConfigBlank(config)) return null;
	return {
		...config,
		name: config.name === defaultName ? template.config.name : config.name,
		instructions: template.config.instructions,
		tools: template.config.tools ?? [],
		integrations: template.config.integrations ?? [],
		config: { ...config.config, ...template.config.config },
		...(template.config.cards && { cards: template.config.cards }),
		personalisation: {
			icon: template.icon,
			gradient: { ...template.gradient },
		},
	};
}
