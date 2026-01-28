# Security Audit UI - Launch Checklist

## Overview

Feature flag: `064_security_audit_ui`
Access: Owner + Admin (via `securityAudit:generate` scope)
Branch: `security-audit-ui`

---

## Pre-Launch Checklist

### 1. Testing

#### E2E Tests (Playwright)

- [ ] **Permission-based visibility**
  - [ ] Owner can see menu item and access route
  - [ ] Admin can see menu item and access route
  - [ ] Member cannot see menu item, route redirects
  - [ ] Unauthenticated redirects to login

- [ ] **Full flow**
  - [ ] Empty state shown before first audit
  - [ ] Loading state appears on "Run Audit" click
  - [ ] Results display after completion
  - [ ] Categories expand/collapse correctly
  - [ ] Workflow/credential links navigate correctly

#### Unit/Integration Tests (Vitest)

- [ ] `securityAudit.store.ts` - state management, error handling
- [ ] `SecurityAuditCategory.vue` - expand/collapse, pagination, status colors
- [ ] `SettingsSecurityAuditView.vue` - conditional rendering states
- [ ] `useSettingsItems.ts` - feature flag + RBAC gating

---

### 2. Performance

**Observed:** ~30 seconds on internal instance (15,000+ findings)

- [ ] Verify acceptable timeout handling (no premature failures)
- [ ] Loading message sets expectation: "This may take up to a minute for large instances"
- [ ] Consider: Should we add a progress indicator or server-sent events for long audits?
- [ ] Test on instances of varying sizes (small, medium, large)

---

### 3. Audit Rules Review

Consult with team on which audit rules are still valid/relevant:

| Category | Sections | Action Needed |
|----------|----------|---------------|
| **Credentials** | Unused in any workflow, inactive workflows, 90 days | Review thresholds |
| **Database** | SQL injection (expressions in queries, missing params) | Still valid? |
| **Nodes** | Official risky nodes, community nodes | Review "risky" classification |
| **Instance** | Unprotected webhooks | Still relevant? |
| **Filesystem** | Nodes interacting with filesystem | Still relevant? |

Questions to answer:
- [ ] Are archived workflows included? (Currently: Yes) - Is this desired?
- [ ] Should "official risky nodes" (HTTP Request, Code) be flagged? High noise.
- [ ] Are the recommendations actionable and accurate?

---

### 4. Feature Flag Verification

- [ ] Flag disabled: Menu item hidden, route inaccessible
- [ ] Flag enabled: Menu item visible, route accessible
- [ ] Test flag toggle without app restart (if applicable)
- [ ] Verify PostHog experiment tracking fires correctly

---

### 5. Error Handling

- [ ] Network failure during audit - error state shown
- [ ] Timeout handling - graceful failure message
- [ ] Partial failures - how are they surfaced?
- [ ] Retry mechanism - can user re-run after failure?

---

### 6. Documentation

- [ ] Update Quality Corner with feature documentation
- [ ] Add to admin guide (if applicable)
- [ ] Internal announcement when flag is enabled

---

## Launch Steps

1. [ ] All tests passing
2. [ ] Code review approved
3. [ ] Merge to master
4. [ ] Enable feature flag for internal testing (n8n team)
5. [ ] Monitor for issues (1 week)
6. [ ] Gradual rollout to customers
7. [ ] Full release

---

## Customer Support FAQ

### General

**Q: What is the Security Audit?**
A: The Security Audit is a diagnostic tool that scans your n8n instance for potential security risks and best practice violations. It helps administrators identify areas that may need attention, such as unused credentials, unprotected webhooks, or SQL injection risks.

**Q: Does this mean my instance is insecure?**
A: No. The audit flags *potential* risks and areas for improvement - not confirmed vulnerabilities. Many findings are informational and depend on your specific use case. For example, an "unprotected webhook" may be intentional if it's designed for public access.

**Q: Who can run the Security Audit?**
A: Only instance Owners and Admins have access to this feature.

### Understanding Results

**Q: Why do I have thousands of "Official risky nodes" findings?**
A: This category flags nodes that *can* execute arbitrary code or make external requests (HTTP Request, Code, SSH, etc.). These are legitimate n8n features, not security flaws. The audit highlights them so you can review their usage, especially in workflows created by multiple users.

**Q: What does "Credentials not used in any workflow" mean?**
A: These are credentials stored in your instance that aren't currently attached to any workflow. They may be leftover from deleted workflows or testing. Consider removing them to reduce your security surface.

**Q: Why are my webhooks flagged as "unprotected"?**
A: Webhooks with Authentication set to "None" are publicly accessible. This is often intentional (e.g., receiving webhooks from third-party services). Review each to confirm the exposure is expected.

**Q: The audit shows SQL injection risks. Am I vulnerable?**
A: The audit flags SQL nodes using expressions in queries without parameterized inputs. This *could* be a risk if user-controlled data flows into those expressions. Review the flagged workflows to ensure inputs are trusted or properly sanitized.

### Performance

**Q: Why does the audit take so long?**
A: The audit scans all workflows, credentials, and nodes in your instance. Large instances (1000+ workflows) may take 30-60 seconds. This is expected behavior.

**Q: Can I run the audit while workflows are executing?**
A: Yes. The audit is read-only and doesn't affect running workflows.

### Taking Action

**Q: Do I need to fix everything the audit finds?**
A: No. The audit provides recommendations, not requirements. Prioritize based on your security posture:
- **High priority:** Unused credentials, SQL injection risks
- **Medium priority:** Unprotected webhooks (if unintended)
- **Lower priority:** "Risky nodes" (review, but often expected)

**Q: How often should I run the audit?**
A: We recommend running it periodically (monthly) or after significant changes to your instance (new team members, bulk workflow imports, etc.).

**Q: Will findings affect my instance functionality?**
A: No. The audit is purely informational. It doesn't modify, disable, or affect any workflows or credentials.

---

## P2: Future Enhancements

### Planned Improvements

| Feature | Description | Value |
|---------|-------------|-------|
| **Dismiss warnings** | Allow admins to acknowledge/dismiss specific findings | Reduces noise, tracks intentional exceptions |
| **Diff with previous audit** | Compare current audit to last run, highlight new/resolved issues | Quick identification of changes |
| **Audit trend report** | Track finding counts over time (chart/graph) | Measure security posture improvement |
| **Export to CSV/PDF** | Download audit results for compliance/reporting | External sharing, audit trails |
| **Scheduled audits** | Auto-run audits on a schedule (weekly/monthly) | Proactive monitoring |
| **Email notifications** | Alert admins when new critical findings appear | Don't have to remember to check |

### Potential Expansions

| Area | Ideas |
|------|-------|
| **Custom rules** | Allow admins to define their own audit checks |
| **Severity levels** | Classify findings as Critical/High/Medium/Low |
| **Remediation actions** | One-click fixes (e.g., delete unused credential) |
| **Compliance templates** | Pre-built rule sets for SOC2, GDPR, etc. |
| **Workflow-level audit** | Run audit on a single workflow before publishing |

### Scope Boundaries

> **Important:** This feature is intentionally separate from Audit Logs / Audit Controls.

| This Feature (Security Audit) | Audit Logs (Enterprise) |
|-------------------------------|-------------------------|
| Point-in-time security posture scan | Continuous activity logging |
| Goodwill / security basics | Compliance requirement |
| Available to all tiers | Enterprise-only |
| Recommendations & best practices | Who did what, when |
| No data retention | Retained event history |

The Security Audit is a **free, goodwill feature** helping all users understand their security posture. It should not be confused with or bundled into enterprise Audit Logs, which serve compliance/regulatory needs.

---

## Contacts

- **Feature Owner:** Declan Carroll
- **Security Review:** TBD
- **Backend (Audit Service):** TBD
