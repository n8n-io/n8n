import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class HumanInTheLoopBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.HUMAN_IN_THE_LOOP;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Human-in-the-Loop Workflows

## Workflow Design

Structure workflows in three stages: Automation → Human Decision → Resume Processing. The Wait node is the core component for implementing pauses.

Break the workflow into clear stages:
1. **Initial Automation**: Execute automated steps leading to the decision point (data extraction, AI content generation, etc.)
2. **Human Notification**: Send notification with resume URL via preferred channel (Email, Slack, Telegram)
3. **Wait for Response**: Configure Wait node with appropriate resume condition
4. **Process Decision**: Use IF/Switch nodes to branch based on human input

Example pattern:
- Trigger → Generate Content → Email (with resume URLs) → Wait Node → IF (decision) → Publish/Reject
- HTTP Request (fetch data) → Filter → Email Manager → Wait (On Webhook) → Switch (approval status) → Database Update

CRITICAL: Always include the $execution.resumeUrl in notification messages. This unique URL resumes the specific workflow execution when accessed.

## Wait Node Configuration

The Wait node supports four resume conditions:
- **After Time Interval**: Resume after fixed delay (not for human decisions)
- **At Specified Time**: Resume at specific date/time (not for human decisions)
- **On Webhook Call**: Resume when URL is accessed (ideal for link-based approvals)
- **On Form Submitted**: Resume when user submits n8n-hosted form (best for structured input)

For human-in-the-loop, use "On Webhook Call" or "On Form Submitted" modes.

### Webhook Configuration
- Set HTTP method (GET for simple links, POST for data)
- Configure authentication if needed (None for private URLs, Basic/Token for security)
- Enable "Ignore Bots" to prevent email scanners/chat bots from triggering
- Use Webhook Suffix for multiple wait points in same workflow

### Form Configuration
- Design form fields directly in Wait node
- Specify field types, labels, validation
- Form automatically hosts at resume URL
- Submitted data merges with workflow context

## Timeout Management

Always configure "Limit Wait Time" to prevent infinite waits:
- Set maximum wait duration (e.g., 48 hours)
- Or specify absolute deadline date
- Handle timeout case in workflow logic
- Check if resumed by timeout (no webhook/form data present)

## Communication Patterns

### Direct Link Method
Include $execution.resumeUrl directly in messages:

Email: Click to [Approve]({{$execution.resumeUrl}}?decision=approve) or [Reject]({{$execution.resumeUrl}}?decision=reject)
Slack: Please review and click: {{$execution.resumeUrl}}

### Platform Response Method
For responses within platform (Slack reply, email response):
- Use separate trigger workflow to catch responses
- Correlate to correct execution via ID
- Call resume URL programmatically
- More complex but keeps interaction native

## Data Handling

The Wait node preserves all prior workflow data when resuming:
- Original context remains available
- New input data (form/webhook) adds to context
- Access webhook data via $json after Wait node
- Query parameters available in $json.query
- Form fields merge directly into JSON output

## Recommended Nodes

### Wait (n8n-nodes-base.wait)

**Purpose**: Core node for pausing workflow execution until human input

**Key Settings**:
- Resume: "On Webhook Call" or "On Form Submitted"
- Authentication: Configure based on security needs
- Ignore Bots: Enable to prevent accidental triggers
- Limit Wait Time: Set timeout to prevent infinite waits

**Use Cases**:
- Approval workflows
- Data collection from humans
- Multi-step verification processes

**Best Practices**:
- Always include timeout handling
- Use unique webhook suffixes for multiple waits
- Test resume URLs during development

### Email (n8n-nodes-base.emailSend)

**Purpose**: Send notifications with resume links to users

**Use Cases**:
- Approval request emails
- Data verification requests
- Task assignment notifications

**Best Practices**:
- Include clear call-to-action buttons
- Embed resume URL as hyperlinks
- Provide context about the decision needed

### Slack (n8n-nodes-base.slack)

**Purpose**: Send notifications via Slack with resume links

**Best Practices**:
- Wrap URLs in <> to prevent unfurling
- Use clear message formatting
- Consider using blocks for rich formatting

### Telegram (n8n-nodes-base.telegram)

**Purpose**: Send notifications via Telegram

**Best Practices**:
- Enable "Ignore Bots" in Wait node
- Use inline keyboards for better UX
- Keep messages concise

### IF (n8n-nodes-base.if)

**Purpose**: Branch workflow based on human decision

**Use Cases**:
- Route approved vs rejected items
- Check if response was received (vs timeout)
- Validate input data

**Best Practices**:
- Handle all possible decision values
- Include default/timeout branch
- Use clear condition names

### Switch (n8n-nodes-base.switch)

**Purpose**: Multi-way branching for complex decisions

**Use Cases**:
- Multiple approval levels
- Various response options
- Status-based routing

### HTTP Request (n8n-nodes-base.httpRequest)

**Purpose**: Call external APIs after human decision

**Use Cases**:
- Update external systems
- Trigger downstream processes
- Log decisions to external services

### Database Nodes

**MySQL** (n8n-nodes-base.mySql), **Postgres** (n8n-nodes-base.postgres), **MongoDB** (n8n-nodes-base.mongoDb):
- Store approval history
- Update record status after decision
- Log human inputs for audit

### Google Sheets (n8n-nodes-base.googleSheets)

**Purpose**: Track decisions and maintain approval logs

**Use Cases**:
- Approval tracking spreadsheets
- Decision audit logs
- User response collection

## Common Pitfalls to Avoid

### Accidental Resume Triggers

**Problem**: Email clients or chat apps preview links and trigger resume unintentionally.

**Solution**:
- Enable "Ignore Bots" option in Wait node
- Wrap Slack URLs in <> to prevent unfurling
- Use authentication for sensitive workflows
- Educate users to click only when ready

### Missing Timeouts

**Problem**: Workflow waits forever if human never responds.

**Solution**:
- Always set "Limit Wait Time" (e.g., 3 days)
- Handle timeout scenario in workflow logic
- Send reminder before deadline
- Escalate to another person if timeout occurs

### Lost Context After Wait

**Problem**: Assuming data is lost after Wait node resumes.

**Solution**:
- Wait node preserves all prior data automatically
- New input merges with existing context
- Test data structure after resume
- Use expressions to access both old and new data

### Security Issues with Resume URLs

**Problem**: Resume URLs exposed to unauthorized users.

**Solution**:
- Treat resume URLs as secrets
- Use authentication options for sensitive workflows
- Send only through private channels
- Consider IP whitelisting if needed

### Multiple Wait Node Confusion

**Problem**: Using same webhook URL for different wait points.

**Solution**:
- Use unique Webhook Suffix for each Wait node
- Generate fresh $execution.resumeUrl for each wait
- Label wait points clearly
- Document which URL corresponds to which decision

### Not Handling All Response Types

**Problem**: Only handling expected responses, not edge cases.

**Solution**:
- Handle timeout case explicitly
- Provide default action for unexpected inputs
- Validate form data before processing
- Log all decisions for debugging

### Workflow State Persistence

**Problem**: Worrying about resource consumption during wait.

**Solution**:
- Waiting executions are saved to database, not running
- No worker threads consumed during wait
- Can have hundreds of paused workflows
- Survives n8n restarts (state in database)

### Complex Parallel Approvals

**Problem**: Need multiple people to approve before continuing.

**Solution**:
- Use separate Wait node per approver
- Or create sub-workflow per approver
- Use Merge node to synchronize branches
- Consider approval tracking in database`;

	getDocumentation(): string {
		return this.documentation;
	}
}
