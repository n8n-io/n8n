<script lang="ts" setup>
/**
 * InstanceAiPermissionsGalleryView.vue
 *
 * Design-time gallery showing every permission / approval / confirmation UI
 * surfaced by Instance AI. Each component is rendered with sample props so the
 * full set of states can be reviewed side-by-side without driving them through
 * a real agent run.
 *
 * Reachable at /instance-ai-permissions-gallery. Not linked from navigation.
 *
 * Caveat: components that call into `useInstanceAiStore()` will dispatch real
 * confirmation requests with the mock requestIds. The backend rejects them and
 * a toast appears — that's expected and harmless. The visuals are accurate.
 */
import { onMounted, ref } from 'vue';
import { N8nButton, N8nCallout, N8nCard, N8nHeading, N8nInput, N8nText } from '@n8n/design-system';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import ConfirmationFooter from '../components/ConfirmationFooter.vue';
import ConfirmationPreview from '../components/ConfirmationPreview.vue';
import DomainAccessApproval from '../components/DomainAccessApproval.vue';
import GatewayResourceDecision from '../components/GatewayResourceDecision.vue';
import PlanReviewPanel, { type PlannedTaskArg } from '../components/PlanReviewPanel.vue';
import InstanceAiQuestions, {
	type QuestionAnswer,
	type QuestionItem,
} from '../components/InstanceAiQuestions.vue';

const documentTitle = useDocumentTitle();

onMounted(() => {
	documentTitle.set('Instance AI permissions — design gallery');
});

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const singlePlanTask: PlannedTaskArg[] = [
	{
		id: 't1',
		title: 'Create a Slack notifier workflow',
		kind: 'workflow',
		spec: 'Build a workflow that listens for new GitHub issues and posts a summary to #alerts.',
		deps: [],
	},
];

const multiPlanTasks: PlannedTaskArg[] = [
	{
		id: 't1',
		title: 'Create the data table',
		kind: 'data-table',
		spec: 'Create a "leads" table with columns: email, source, score, created_at.',
		deps: [],
	},
	{
		id: 't2',
		title: 'Build the ingest workflow',
		kind: 'workflow',
		spec: 'Webhook → enrichment → write into the leads table.',
		deps: ['t1'],
	},
	{
		id: 't3',
		title: 'Build the daily digest workflow',
		kind: 'workflow',
		spec: 'Cron trigger → query top scoring leads from the last 24h → send to Slack.',
		deps: ['t1', 't2'],
	},
];

const singleQuestion: QuestionItem[] = [
	{
		id: 'q1',
		question: 'Which messaging tool should we notify on?',
		type: 'single',
		options: ['Slack', 'Microsoft Teams', 'Discord', 'Email'],
	},
];

const multiQuestion: QuestionItem[] = [
	{
		id: 'q1',
		question: 'Which fields should be enriched on each lead?',
		type: 'multi',
		options: ['Company', 'Job title', 'LinkedIn URL', 'Country', 'Time zone'],
	},
];

const textQuestion: QuestionItem[] = [
	{
		id: 'q1',
		question: 'What should the workflow be called?',
		type: 'text',
	},
];

const multiStepQuestions: QuestionItem[] = [
	{
		id: 'q1',
		question: 'Which channel should we post into?',
		type: 'single',
		options: ['#alerts', '#general', '#engineering'],
	},
	{
		id: 'q2',
		question: 'Which severities should trigger a post?',
		type: 'multi',
		options: ['Critical', 'High', 'Medium', 'Low'],
	},
	{
		id: 'q3',
		question: 'Anything else we should mention in the message?',
		type: 'text',
	},
];

// ---------------------------------------------------------------------------
// Per-action examples — one card per InstanceAiPermissions key, showing the
// approval surface the user actually sees when the agent attempts the action.
// Mirrors the keys in SettingsInstanceAiView.vue#permissionKeys.
// ---------------------------------------------------------------------------

interface ActionExample {
	key: string;
	actionLabel: string;
	title: string;
	message: string;
	severity?: 'destructive';
	specialisedVariant?: string;
}

const actionExamples: ActionExample[] = [
	{
		key: 'createWorkflow',
		actionLabel: 'Create workflow',
		title: 'Create workflow “GitHub issue notifier”',
		message:
			'Build a workflow that listens for new issues in a GitHub repo and posts a summary to a Slack channel.',
	},
	{
		key: 'updateWorkflow',
		actionLabel: 'Update workflow',
		title: 'Update workflow “Lead enrichment”',
		message: 'Add a Set node before the HTTP Request to coerce email to lower case.',
	},
	{
		key: 'runWorkflow',
		actionLabel: 'Run workflow',
		title: 'Run workflow “Lead enrichment”',
		message: 'Trigger one execution with the sample input I prepared earlier.',
	},
	{
		key: 'publishWorkflow',
		actionLabel: 'Activate workflow',
		title: 'Activate workflow “Daily digest”',
		message: 'Turn the workflow on so its cron trigger starts firing every morning at 09:00 UTC.',
	},
	{
		key: 'deleteWorkflow',
		actionLabel: 'Delete workflow',
		title: 'Delete workflow “Old onboarding flow”',
		message: 'This workflow has 12 prior executions. Deleting it cannot be undone.',
		severity: 'destructive',
	},
	{
		key: 'deleteCredential',
		actionLabel: 'Delete credential',
		title: 'Delete credential “Stale Slack token”',
		message: '5 workflows reference this credential — they will fail until reconfigured.',
		severity: 'destructive',
	},
	{
		key: 'createFolder',
		actionLabel: 'Create folder',
		title: 'Create folder “Marketing”',
		message: 'Add a new folder under the Personal project for grouping marketing workflows.',
	},
	{
		key: 'deleteFolder',
		actionLabel: 'Delete folder',
		title: 'Delete folder “Archived”',
		message: 'The folder contains 4 workflows. They will be moved to the project root.',
		severity: 'destructive',
	},
	{
		key: 'moveWorkflowToFolder',
		actionLabel: 'Move workflow to folder',
		title: 'Move workflow “Lead enrichment” to folder “Marketing”',
		message: 'From: Inbox · To: Marketing',
	},
	{
		key: 'tagWorkflow',
		actionLabel: 'Tag workflow',
		title: 'Tag workflow “Lead enrichment”',
		message: 'Add tags: production, customer-data.',
	},
	{
		key: 'createDataTable',
		actionLabel: 'Create data table',
		title: 'Create data table “leads”',
		message: 'Columns: email (string), source (string), score (number), created_at (datetime).',
	},
	{
		key: 'mutateDataTableSchema',
		actionLabel: 'Modify data table schema',
		title: 'Modify schema of data table “leads”',
		message: 'Add column “enriched_at” (datetime, nullable).',
	},
	{
		key: 'mutateDataTableRows',
		actionLabel: 'Modify data table rows',
		title: 'Update 47 rows in data table “leads”',
		message: "Set status = 'archived' where created_at < 2025-01-01.",
	},
	{
		key: 'cleanupTestExecutions',
		actionLabel: 'Clean up test executions',
		title: 'Delete 14 test executions for workflow “Lead enrichment”',
		message: 'Remove all manual test executions older than 7 days.',
		severity: 'destructive',
	},
	{
		key: 'readFilesystem',
		actionLabel: 'Read filesystem',
		title: 'Read file “/Users/tuukka/Documents/leads.csv”',
		message: 'Open the file to extract a contact list for the workflow.',
		specialisedVariant: 'GatewayResourceDecision',
	},
	{
		key: 'fetchUrl',
		actionLabel: 'Fetch URL',
		title: 'Fetch https://api.openweathermap.org/data/2.5/weather?q=London',
		message: 'Make a GET request to fetch current weather data for London.',
		specialisedVariant: 'DomainAccessApproval',
	},
	{
		key: 'restoreWorkflowVersion',
		actionLabel: 'Restore workflow version',
		title: 'Restore workflow “Lead enrichment” to version from 2026-04-15',
		message:
			'Overwrites the current state with the version saved 2 weeks ago. Recent edits will be lost.',
		severity: 'destructive',
	},
];

// ---------------------------------------------------------------------------
// Inline ask-user (text input) — replicated from InstanceAiConfirmationPanel
// ---------------------------------------------------------------------------

const askUserEmpty = ref('');
const askUserPrefilled = ref('Add a retry with exponential backoff.');

// ---------------------------------------------------------------------------
// Question event handlers (no-op — we just want to see the UI)
// ---------------------------------------------------------------------------

function logAnswers(answers: QuestionAnswer[]) {
	// eslint-disable-next-line no-console
	console.log('[gallery] questions submitted', answers);
}

function logPlanAllow() {
	// eslint-disable-next-line no-console
	console.log('[gallery] plan approved');
}

function logPlanRequestChanges(feedback: string) {
	// eslint-disable-next-line no-console
	console.log('[gallery] plan changes requested', feedback);
}
</script>

<template>
	<div :class="$style.page">
		<header :class="$style.pageHeader">
			<N8nHeading size="2xlarge" bold>Instance AI permission components</N8nHeading>
			<N8nText color="text-light">
				Static gallery of every permission, approval and confirmation surface used by Instance AI.
				Use this page to iterate on visual design — every variant is rendered with mock data, no
				real agent run required.
			</N8nText>
			<N8nCallout theme="info" icon="info">
				Buttons inside the components dispatch real confirmation requests with mock IDs. The backend
				rejects them and you'll see a toast — that's expected.
			</N8nCallout>
		</header>

		<!-- =================================================================
		     Generic approval (used by orchestrator + sub-agents for any tool
		     call that needs human-in-the-loop confirmation)
		     ================================================================= -->
		<section :class="$style.section">
			<div :class="$style.sectionHeader">
				<N8nHeading size="large" bold>Generic approval</N8nHeading>
				<N8nText color="text-light" tag="p">
					Used when a sub-agent wants to call a tool that mutates state. Wrapped in the "approval"
					container; multiple pending items collapse into a single card with an "Allow all"
					shortcut.
				</N8nText>
			</div>

			<!-- Single, default severity -->
			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption"
					>Single item · default severity</N8nText
				>
				<div :class="$style.confirmationCard">
					<div :class="$style.approvalRow">
						<div :class="$style.approvalRowBody">
							<N8nText size="large" bold>Update workflow “Lead enrichment”</N8nText>
							<ConfirmationPreview>
								Add a Set node before the HTTP Request to coerce email to lower case.
							</ConfirmationPreview>
						</div>
						<ConfirmationFooter>
							<N8nButton variant="outline" size="medium">Deny</N8nButton>
							<N8nButton variant="solid" size="medium">Allow</N8nButton>
						</ConfirmationFooter>
					</div>
				</div>
			</div>

			<!-- Single, destructive severity -->
			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption"
					>Single item · destructive severity</N8nText
				>
				<div :class="$style.confirmationCard">
					<div :class="$style.approvalRow">
						<div :class="$style.approvalRowBody">
							<N8nText size="large" bold>Delete workflow “Old onboarding flow”</N8nText>
							<ConfirmationPreview>
								This workflow has 12 prior executions. Deleting it cannot be undone.
							</ConfirmationPreview>
						</div>
						<ConfirmationFooter>
							<N8nButton variant="outline" size="medium">Deny</N8nButton>
							<N8nButton variant="destructive" size="medium">Allow</N8nButton>
						</ConfirmationFooter>
					</div>
				</div>
			</div>

			<!-- Group with "Allow all" -->
			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption">
					Multiple items · same agent · "Allow all" shortcut
				</N8nText>
				<div :class="$style.confirmationCard">
					<div :class="$style.generic">
						<N8nText>Workflow Builder needs your approval</N8nText>
						<N8nButton size="medium" variant="subtle">Allow all</N8nButton>
					</div>
					<div :class="$style.items">
						<div :class="[$style.item, $style.itemBordered]">
							<div :class="$style.approvalRow">
								<div :class="$style.approvalRowBody">
									<N8nText size="large" bold>Tag workflow “Lead enrichment”</N8nText>
									<ConfirmationPreview>Add tag: production</ConfirmationPreview>
								</div>
								<ConfirmationFooter>
									<N8nButton variant="outline" size="medium">Deny</N8nButton>
									<N8nButton variant="solid" size="medium">Allow</N8nButton>
								</ConfirmationFooter>
							</div>
						</div>
						<div :class="[$style.item, $style.itemBordered]">
							<div :class="$style.approvalRow">
								<div :class="$style.approvalRowBody">
									<N8nText size="large" bold>Move workflow to folder “Marketing”</N8nText>
									<ConfirmationPreview>From: Inbox · To: Marketing</ConfirmationPreview>
								</div>
								<ConfirmationFooter>
									<N8nButton variant="outline" size="medium">Deny</N8nButton>
									<N8nButton variant="solid" size="medium">Allow</N8nButton>
								</ConfirmationFooter>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- =================================================================
		     Per-action examples — one card per action the agent can take
		     ================================================================= -->
		<section :class="$style.section">
			<div :class="$style.sectionHeader">
				<N8nHeading size="large" bold>Per-action examples</N8nHeading>
				<N8nText color="text-light" tag="p">
					One sample dialog for every action listed under
					<code>SettingsInstanceAiView.permissionKeys</code>. Most use the generic-approval shape;
					<code>fetchUrl</code> and <code>readFilesystem</code> have specialised variants shown
					later on this page.
				</N8nText>
			</div>

			<div v-for="example in actionExamples" :key="example.key" :class="$style.demo">
				<div :class="$style.actionCaptionRow">
					<N8nText size="small" color="text-light" :class="$style.caption">
						{{ example.actionLabel }}
					</N8nText>
					<N8nText
						v-if="example.specialisedVariant"
						size="small"
						color="text-light"
						:class="$style.specialisedNote"
					>
						also rendered as <code>{{ example.specialisedVariant }}</code>
					</N8nText>
				</div>
				<div :class="$style.confirmationCard">
					<div :class="$style.approvalRow">
						<div :class="$style.approvalRowBody">
							<N8nText size="large" bold>{{ example.title }}</N8nText>
							<ConfirmationPreview>{{ example.message }}</ConfirmationPreview>
						</div>
						<ConfirmationFooter>
							<N8nButton variant="outline" size="medium">Deny</N8nButton>
							<N8nButton
								:variant="example.severity === 'destructive' ? 'destructive' : 'solid'"
								size="medium"
							>
								Allow
							</N8nButton>
						</ConfirmationFooter>
					</div>
				</div>
			</div>
		</section>

		<!-- =================================================================
		     Domain access (network egress from sandboxed tooling)
		     ================================================================= -->
		<section :class="$style.section">
			<div :class="$style.sectionHeader">
				<N8nHeading size="large" bold>Domain access approval</N8nHeading>
				<N8nText color="text-light" tag="p">
					Shown when the agent (typically the researcher or a code-execution sub-agent) wants to
					fetch a URL whose host hasn't been pre-approved. Severity flips the primary action between
					"Allow domain" and "Allow once".
				</N8nText>
			</div>

			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption"
					>Default severity · primary "Allow domain"</N8nText
				>
				<div :class="$style.confirmationCard">
					<DomainAccessApproval
						request-id="gallery-domain-default"
						url="https://api.openweathermap.org/data/2.5/weather?q=London"
						host="api.openweathermap.org"
					/>
				</div>
			</div>

			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption"
					>Destructive severity · primary "Allow once"</N8nText
				>
				<div :class="$style.confirmationCard">
					<DomainAccessApproval
						request-id="gallery-domain-destructive"
						url="https://internal-admin.example.com/api/v1/users/delete-all"
						host="internal-admin.example.com"
						severity="destructive"
					/>
				</div>
			</div>
		</section>

		<!-- =================================================================
		     Gateway resource decision (filesystem / network gateway prompts)
		     ================================================================= -->
		<section :class="$style.section">
			<div :class="$style.sectionHeader">
				<N8nHeading size="large" bold>Gateway resource decision</N8nHeading>
				<N8nText color="text-light" tag="p">
					Emitted by the filesystem and network gateways when the sandbox attempts to access
					something outside the pre-allowed set. Options vary by gateway — usually
					<code>allowOnce</code>, <code>allowForSession</code>, <code>denyOnce</code>.
				</N8nText>
			</div>

			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption">All three options</N8nText>
				<GatewayResourceDecision
					request-id="gallery-gw-all"
					resource="/Users/tuukka/Documents/customer-data.csv"
					description="The Researcher agent wants to read this file to extract a contact list."
					:options="['allowOnce', 'allowForSession', 'denyOnce']"
				/>
			</div>

			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption"
					>Only "Allow once" + "Deny"</N8nText
				>
				<GatewayResourceDecision
					request-id="gallery-gw-once"
					resource="api.github.com"
					description="The Workflow Builder wants to make an outbound HTTP call to validate a webhook."
					:options="['allowOnce', 'denyOnce']"
				/>
			</div>

			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption"
					>With unknown / extension options</N8nText
				>
				<GatewayResourceDecision
					request-id="gallery-gw-unknown"
					resource="postgres://prod-replica/leads"
					description="The Data Table Manager wants to import 10,000 rows from this database."
					:options="['allowOnce', 'allowForSession', 'denyOnce', 'allowReadOnly']"
				/>
			</div>
		</section>

		<!-- =================================================================
		     Plan review
		     ================================================================= -->
		<section :class="$style.section">
			<div :class="$style.sectionHeader">
				<N8nHeading size="large" bold>Plan review</N8nHeading>
				<N8nText color="text-light" tag="p">
					Shown after the orchestrator drafts a multi-step plan and before any sub-agent starts
					executing. User can approve all tasks at once or request changes with free-form feedback.
				</N8nText>
			</div>

			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption">Single task</N8nText>
				<PlanReviewPanel
					:planned-tasks="singlePlanTask"
					@approve="logPlanAllow"
					@request-changes="logPlanRequestChanges"
				/>
			</div>

			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption"
					>Multiple tasks with dependencies</N8nText
				>
				<PlanReviewPanel
					:planned-tasks="multiPlanTasks"
					@approve="logPlanAllow"
					@request-changes="logPlanRequestChanges"
				/>
			</div>

			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption"
					>Read-only (rendered in transcript after approval)</N8nText
				>
				<PlanReviewPanel :planned-tasks="multiPlanTasks" read-only />
			</div>

			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption"
					>Loading (plan is being generated)</N8nText
				>
				<PlanReviewPanel :planned-tasks="multiPlanTasks" loading />
			</div>

			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption">Disabled controls</N8nText>
				<PlanReviewPanel
					:planned-tasks="multiPlanTasks"
					disabled
					@approve="logPlanAllow"
					@request-changes="logPlanRequestChanges"
				/>
			</div>
		</section>

		<!-- =================================================================
		     Structured questions (multi-step Q&A wizard)
		     ================================================================= -->
		<section :class="$style.section">
			<div :class="$style.sectionHeader">
				<N8nHeading size="large" bold>Structured questions</N8nHeading>
				<N8nText color="text-light" tag="p">
					Multi-step wizard the orchestrator uses to gather missing information before it writes the
					plan. Questions can be single-select, multi-select, or free text.
				</N8nText>
			</div>

			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption">Single-select</N8nText>
				<InstanceAiQuestions :questions="singleQuestion" @submit="logAnswers" />
			</div>

			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption">Multi-select</N8nText>
				<InstanceAiQuestions :questions="multiQuestion" @submit="logAnswers" />
			</div>

			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption">Text-only</N8nText>
				<InstanceAiQuestions :questions="textQuestion" @submit="logAnswers" />
			</div>

			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption"
					>Multi-step with intro</N8nText
				>
				<InstanceAiQuestions
					:questions="multiStepQuestions"
					intro-message="A few quick questions before I draft the plan."
					@submit="logAnswers"
				/>
			</div>

			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption">Disabled</N8nText>
				<InstanceAiQuestions :questions="singleQuestion" disabled @submit="logAnswers" />
			</div>
		</section>

		<!-- =================================================================
		     Ask-user (inline text prompt)
		     ================================================================= -->
		<section :class="$style.section">
			<div :class="$style.sectionHeader">
				<N8nHeading size="large" bold>Ask-user inline prompt</N8nHeading>
				<N8nText color="text-light" tag="p">
					Lightweight inline alternative to the wizard. The agent asks a single follow-up question
					and the user can either type a reply or skip. Lives inside
					<code>InstanceAiConfirmationPanel.vue</code>.
				</N8nText>
			</div>

			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption"
					>Empty (Skip primary)</N8nText
				>
				<N8nCard :class="$style.textCard">
					<N8nText tag="div">What spreadsheet should I use as the source?</N8nText>
					<div :class="$style.textInputRow">
						<N8nInput
							v-model="askUserEmpty"
							type="text"
							size="small"
							placeholder="Type your answer…"
						/>
						<N8nButton size="medium" variant="outline">Skip</N8nButton>
						<N8nButton size="medium" variant="solid" disabled>Submit</N8nButton>
					</div>
				</N8nCard>
			</div>

			<div :class="$style.demo">
				<N8nText size="small" color="text-light" :class="$style.caption"
					>Pre-filled (Submit primary)</N8nText
				>
				<N8nCard :class="$style.textCard">
					<N8nText tag="div">What change should I make to the workflow?</N8nText>
					<div :class="$style.textInputRow">
						<N8nInput
							v-model="askUserPrefilled"
							type="text"
							size="small"
							placeholder="Type your answer…"
						/>
						<N8nButton size="medium" variant="solid">Submit</N8nButton>
					</div>
				</N8nCard>
			</div>
		</section>

		<!-- =================================================================
		     Out of scope (too tightly coupled to live state to mock here)
		     ================================================================= -->
		<section :class="$style.section">
			<div :class="$style.sectionHeader">
				<N8nHeading size="large" bold>Not in this gallery</N8nHeading>
				<N8nText color="text-light" tag="p">
					These confirmation surfaces are tightly coupled to live workflow / credential state and
					can't be mocked without a real backend. To iterate on them, run an agent flow that
					triggers the relevant tool.
				</N8nText>
			</div>
			<ul :class="$style.list">
				<li>
					<N8nText bold>InstanceAiCredentialSetup.vue</N8nText> —
					<N8nText color="text-light">
						resolves real credentials from the credentials store; needs at least one valid
						credential type to render its body.
					</N8nText>
				</li>
				<li>
					<N8nText bold>InstanceAiWorkflowSetup.vue</N8nText> —
					<N8nText color="text-light">
						loads a draft workflow document, hydrates per-node parameter inputs and runs credential
						tests; needs a live workflow ID.
					</N8nText>
				</li>
			</ul>
		</section>
	</div>
</template>

<style lang="scss" module>
.page {
	max-width: 880px;
	margin: 0 auto;
	padding: var(--spacing--xl) var(--spacing--lg) var(--spacing--2xl);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
}

.pageHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding-top: var(--spacing--lg);
	border-top: var(--border);
}

.sectionHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.demo {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.caption {
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.actionCaptionRow {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.specialisedNote {
	font-style: italic;
}

.list {
	list-style: disc;
	padding-left: var(--spacing--md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

// Mirrors styles in InstanceAiConfirmationPanel.vue so the inline mocks render
// the same as a real wrapped approval.
.confirmationCard {
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
	overflow: hidden;
}

.items {
	display: flex;
	flex-direction: column;
}

.item {
	& + & {
		border-top: var(--border);
	}
}

.itemBordered {
	// Marker class only — actual border is handled via & + & above
}

.approvalRow {
	display: flex;
	flex-direction: column;
	font-size: var(--font-size--2xs);
}

.approvalRowBody {
	padding: var(--spacing--sm) var(--spacing--sm) 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.generic {
	padding: var(--spacing--sm);
	border-bottom: var(--border);
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.textCard {
	background-color: var(--color--background--light-3);
}

.textInputRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}
</style>
