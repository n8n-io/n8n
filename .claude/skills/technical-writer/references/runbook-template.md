# Runbook Template Reference
# Operational procedure for incident response

```markdown
# Runbook: [Procedure Name]

## Overview

[Brief description of what this runbook covers and when to use it]

**Severity**: [SEV-1 | SEV-2 | SEV-3]
**Expected Duration**: [X-Y minutes]
**Required Access**: [List required permissions/roles]

## Prerequisites

- [ ] Access to [system/tool]
- [ ] [Permission/credential] available
- [ ] Communication channel access (#incidents)
- [ ] [Any other prerequisites]

## Detection

### Alerts That Trigger This Runbook

- `[AlertName]` - [Brief description]
- `[AlertName]` - [Brief description]

### Verification Steps

1. Check [specific metric/log]:
   ```bash
   [command to verify issue]
   ```

2. Confirm [condition]:
   ```bash
   [command to confirm]
   ```

## Procedure

### Step 1: [Step Name] ([X] min)

[Description of what to do]

```bash
[commands to execute]
```

**Expected Result**: [What you should see if successful]

### Step 2: [Step Name] ([X] min)

[Description]

```bash
[commands]
```

### Step 3: [Step Name] ([X] min)

[Description]

**If [condition A]:**
```bash
[commands for condition A]
```

**If [condition B]:**
```bash
[commands for condition B]
```

## Verification

After completing the procedure, verify success:

1. [ ] [Check 1]
2. [ ] [Check 2]
3. [ ] [Check 3]

## Rollback

If the procedure causes issues:

1. [Rollback step 1]
2. [Rollback step 2]
3. [Contact for escalation]

## Contacts

| Role | Name | Contact |
|------|------|---------|
| [Role] On-Call | Rotation | [Contact method] |
| [Team] Lead | [Name] | [Contact] |
| Escalation | [Name] | [Contact] |

## Related Documentation

- [Link to related doc 1]
- [Link to related doc 2]
```

---

## Complete Example: Database Failover

```markdown
# Runbook: Database Failover

## Overview

This runbook covers the procedure for promoting a PostgreSQL replica to primary during a failover event.

**Severity**: SEV-1
**Expected Duration**: 15-30 minutes
**Required Access**: DBA on-call, Platform Engineer

## Prerequisites

- [ ] Access to AWS Console or CLI
- [ ] Database admin credentials
- [ ] Slack access for #incidents channel
- [ ] PagerDuty acknowledgment

## Detection

### Alerts That Trigger This Runbook

- `PostgresPrimaryDown` - Primary database unreachable
- `PostgresReplicationLag > 60s` - Replication significantly delayed
- `PostgresConnectionPoolExhausted` - No available connections

### Verification Steps

1. Check database connectivity:
   ```bash
   psql -h primary.db.internal -U admin -c "SELECT 1"
   ```

2. Check replication status:
   ```bash
   psql -h replica.db.internal -U admin -c "SELECT pg_is_in_recovery()"
   ```

3. Check CloudWatch metrics in AWS Console

## Procedure

### Step 1: Assess the Situation (2 min)

1. Confirm the alert is not a false positive
2. Check if the issue is network-related vs database-related
3. Notify in #incidents: "Investigating database issues, may need failover"

### Step 2: Attempt Primary Recovery (5 min)

If primary appears to be having transient issues:

```bash
# Check process status
ssh primary-db 'sudo systemctl status postgresql'

# Check disk space
ssh primary-db 'df -h'

# Check logs
ssh primary-db 'sudo tail -100 /var/log/postgresql/postgresql-15-main.log'
```

If recoverable, restart the service:
```bash
ssh primary-db 'sudo systemctl restart postgresql'
```

**If recovery fails after 5 minutes, proceed to failover.**

### Step 3: Initiate Failover (5 min)

1. **Stop writes to primary** (if still accessible):
   ```sql
   -- On primary
   ALTER SYSTEM SET default_transaction_read_only = on;
   SELECT pg_reload_conf();
   ```

2. **Promote replica**:
   ```bash
   # AWS RDS
   aws rds promote-read-replica --db-instance-identifier replica-db

   # Self-managed
   ssh replica-db 'sudo -u postgres pg_ctl promote -D /var/lib/postgresql/15/main'
   ```

3. **Verify promotion**:
   ```bash
   psql -h replica.db.internal -U admin -c "SELECT pg_is_in_recovery()"
   # Should return 'f' (false)
   ```

### Step 4: Update Application Configuration (3 min)

1. **Update DNS** (if using DNS-based failover):
   ```bash
   aws route53 change-resource-record-sets \
     --hosted-zone-id ZONE_ID \
     --change-batch file://failover-dns.json
   ```

2. **Or update connection strings** via config management:
   ```bash
   # Update Kubernetes secret
   kubectl patch secret db-credentials -n production \
     -p '{"data":{"host":"'$(echo -n "new-primary.db.internal" | base64)'"}}'

   # Restart application pods
   kubectl rollout restart deployment/app -n production
   ```

### Step 5: Verify Application Health (5 min)

1. Check application logs for database errors
2. Monitor error rates in Datadog/Grafana
3. Verify key user flows are working
4. Check connection pool metrics

### Step 6: Post-Failover Tasks

1. **Create new replica** from new primary
2. **Investigate root cause** of original primary failure
3. **Update monitoring** to point to new topology
4. **Document incident** in post-mortem

## Rollback

If the failover causes issues:

1. **Stop application traffic** (enable maintenance mode)
2. **Restore original primary** from backup if needed
3. **Re-point applications** to original primary
4. **Investigate** why failover failed

## Contacts

| Role | Name | Contact |
|------|------|---------|
| DBA On-Call | Rotation | PagerDuty |
| Platform Lead | Jane Smith | @jane.smith |
| VP Engineering | John Doe | @john.doe (escalation) |

## Related Documentation

- \[Database Architecture\](../architecture/database.md)
- \[Backup & Recovery\](./backup-recovery.md)
- \[Incident Response Process\](../processes/incident-response.md)
```

---

## Runbook Best Practices

### Structure
- Start with overview and severity
- List all prerequisites upfront
- Include verification at each step
- Always have a rollback section
- End with contacts and related docs

### Commands
- All commands must be copy-pasteable
- Include expected output where helpful
- Use environment variables for secrets
- Show both success and failure indicators

### Maintenance
- Review runbooks quarterly
- Update after every incident where used
- Include "last tested" date
- Conduct dry-runs for critical procedures
