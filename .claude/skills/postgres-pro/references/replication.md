# PostgreSQL Replication

## Streaming Replication (Physical)

### Primary Server Setup

```sql
-- postgresql.conf
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
wal_keep_size = 1GB  # Or 1024MB for older versions
hot_standby = on
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'

-- pg_hba.conf (allow replication connections)
host replication replicator 10.0.0.0/24 scram-sha-256
```

```sql
-- Create replication user
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '<replication-password>';

-- Create replication slot (prevents WAL deletion)
SELECT * FROM pg_create_physical_replication_slot('replica_1');
```

### Standby Server Setup

```bash
# Stop PostgreSQL on standby
systemctl stop postgresql

# Remove data directory
rm -rf /var/lib/postgresql/14/main/*

# Base backup from primary
pg_basebackup -h primary-host -D /var/lib/postgresql/14/main \
  -U replicator -P -v -R -X stream -S replica_1

# -R creates standby.signal and recovery config
# -X stream: stream WAL during backup
# -S replica_1: use replication slot
```

```sql
-- standby.signal file created by pg_basebackup -R
-- recovery parameters in postgresql.auto.conf:
primary_conninfo = 'host=primary-host port=5432 user=replicator password=<replication-password>'
primary_slot_name = 'replica_1'
```

### Monitoring Replication

```sql
-- On primary: Check replication status
SELECT
  client_addr,
  state,
  sync_state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) as lag_bytes
FROM pg_stat_replication;

-- On standby: Check replay lag
SELECT
  now() - pg_last_xact_replay_timestamp() AS replication_lag;

-- Check replication slots
SELECT
  slot_name,
  slot_type,
  active,
  restart_lsn,
  pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) as retained_bytes
FROM pg_replication_slots;
```

### Synchronous Replication

```sql
-- postgresql.conf on primary
synchronous_commit = on
synchronous_standby_names = 'FIRST 1 (replica_1, replica_2)'
# Waits for 1 standby to confirm before commit

# Options:
# FIRST n (names): Wait for n standbys
# ANY n (names): Wait for any n standbys
# name: Wait for specific standby

-- Query to check sync status
SELECT
  application_name,
  sync_state,
  state
FROM pg_stat_replication;
-- sync_state: sync (synchronous), async, potential
```

## Logical Replication (Row-level)

### Publisher Setup

```sql
-- postgresql.conf
wal_level = logical
max_replication_slots = 10
max_wal_senders = 10

-- Create publication (all tables)
CREATE PUBLICATION my_publication FOR ALL TABLES;

-- Or specific tables
CREATE PUBLICATION my_publication FOR TABLE users, orders;

-- Or tables matching pattern (PG15+)
CREATE PUBLICATION my_publication FOR TABLES IN SCHEMA public;

-- With row filters (PG15+)
CREATE PUBLICATION active_users FOR TABLE users WHERE (active = true);

-- View publications
SELECT * FROM pg_publication;
SELECT * FROM pg_publication_tables;
```

### Subscriber Setup

```sql
-- Create subscription (creates replication slot on publisher)
CREATE SUBSCRIPTION my_subscription
CONNECTION 'host=publisher-host port=5432 dbname=mydb user=replicator password=<replication-password>'
PUBLICATION my_publication;

-- Subscription options
CREATE SUBSCRIPTION my_subscription
CONNECTION 'host=publisher-host dbname=mydb user=replicator'
PUBLICATION my_publication
WITH (
  copy_data = true,           -- Initial data copy
  create_slot = true,          -- Create replication slot
  enabled = true,              -- Start immediately
  slot_name = 'my_sub_slot',
  synchronous_commit = 'off'   -- Performance vs durability
);

-- View subscriptions
SELECT * FROM pg_subscription;
SELECT * FROM pg_stat_subscription;

-- Manage subscription
ALTER SUBSCRIPTION my_subscription DISABLE;
ALTER SUBSCRIPTION my_subscription ENABLE;
ALTER SUBSCRIPTION my_subscription REFRESH PUBLICATION;
DROP SUBSCRIPTION my_subscription;
```

### Logical Replication Monitoring

```sql
-- On publisher: Check replication slots
SELECT
  slot_name,
  plugin,
  slot_type,
  active,
  pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn) as lag_bytes
FROM pg_replication_slots
WHERE slot_type = 'logical';

-- On subscriber: Check subscription status
SELECT
  subname,
  pid,
  received_lsn,
  latest_end_lsn,
  last_msg_send_time,
  last_msg_receipt_time,
  latest_end_time
FROM pg_stat_subscription;
```

## Cascading Replication

```
Primary -> Standby1 -> Standby2
```

```sql
-- On Standby1 (acts as relay)
-- postgresql.conf
hot_standby = on
max_wal_senders = 10
wal_keep_size = 1GB

-- Standby2 connects to Standby1
-- Same setup as regular standby, but primary_conninfo points to Standby1
primary_conninfo = 'host=standby1-host user=replicator...'
```

## Delayed Replication (Delayed Standby)

```sql
-- On standby: postgresql.conf
recovery_min_apply_delay = '4h'

-- Useful for:
-- - Protection against accidental data deletion
-- - Rolling back to specific point in time
-- - Can promote delayed standby to recover dropped table

-- Check delay
SELECT now() - pg_last_xact_replay_timestamp() AS current_delay;
```

## Failover and Promotion

### Manual Failover

```bash
# On standby server
# Promote standby to primary
pg_ctl promote -D /var/lib/postgresql/14/main

# Or use SQL
SELECT pg_promote();

# Verify promotion
SELECT pg_is_in_recovery();  -- Should return false
```

### Automatic Failover with pg_auto_failover

```bash
# Install pg_auto_failover
apt-get install pg-auto-failover

# Setup monitor node
pg_autoctl create monitor --hostname monitor-host --pgdata /var/lib/monitor

# Setup primary
pg_autoctl create postgres \
  --hostname primary-host \
  --pgdata /var/lib/postgresql/14/main \
  --monitor postgres://monitor-host/pg_auto_failover

# Setup standby
pg_autoctl create postgres \
  --hostname standby-host \
  --pgdata /var/lib/postgresql/14/main \
  --monitor postgres://monitor-host/pg_auto_failover

# Check status
pg_autoctl show state
```

### Patroni (Production HA Solution)

```yaml
# patroni.yml
scope: postgres-cluster
name: node1

restapi:
  listen: 0.0.0.0:8008
  connect_address: node1:8008

etcd:
  hosts: etcd1:2379,etcd2:2379,etcd3:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576
    postgresql:
      use_pg_rewind: true
      parameters:
        max_connections: 100
        max_wal_senders: 10
        wal_level: replica

postgresql:
  listen: 0.0.0.0:5432
  connect_address: node1:5432
  data_dir: /var/lib/postgresql/14/main
  authentication:
    replication:
      username: replicator
      password: <replication-password>
    superuser:
      username: postgres
      password: <superuser-password>
```

## Connection Pooling for HA

### PgBouncer Configuration

```ini
# pgbouncer.ini
[databases]
mydb = host=primary-host port=5432 dbname=mydb

[pgbouncer]
listen_addr = *
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
```

### HAProxy for Load Balancing

```
# haproxy.cfg
frontend postgres_frontend
    bind *:5432
    mode tcp
    default_backend postgres_backend

backend postgres_backend
    mode tcp
    option tcp-check
    tcp-check expect string is_master:true

    server primary primary-host:5432 check
    server standby1 standby1-host:5432 check backup
    server standby2 standby2-host:5432 check backup
```

## Backup and Point-in-Time Recovery (PITR)

### WAL Archiving Setup

```sql
-- postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /backup/wal/%f && cp %p /backup/wal/%f'
archive_timeout = 300  # Force archive every 5 minutes

-- Or use pg_archivecleanup
archive_command = 'pgbackrest --stanza=main archive-push %p'
```

### Base Backup with pg_basebackup

```bash
# Full backup
pg_basebackup -h localhost -U postgres \
  -D /backup/base/$(date +%Y%m%d) \
  -Ft -z -P -X fetch

# -Ft: tar format
# -z: gzip compression
# -P: progress
# -X fetch: include WAL files
```

### Point-in-Time Recovery

```bash
# Stop PostgreSQL
systemctl stop postgresql

# Restore base backup
rm -rf /var/lib/postgresql/14/main/*
tar -xzf /backup/base/20241201/base.tar.gz -C /var/lib/postgresql/14/main

# Create recovery.signal
touch /var/lib/postgresql/14/main/recovery.signal

# Configure recovery
# postgresql.conf or postgresql.auto.conf:
restore_command = 'cp /backup/wal/%f %p'
recovery_target_time = '2024-12-01 14:30:00'
# Or: recovery_target_xid, recovery_target_name, recovery_target_lsn

# Start PostgreSQL (will recover to target)
systemctl start postgresql

# After recovery, check
SELECT pg_is_in_recovery();  # Should be false after recovery completes
```

## Monitoring Best Practices

```sql
-- Create monitoring view
CREATE VIEW replication_status AS
SELECT
  client_addr,
  application_name,
  state,
  sync_state,
  pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) / 1024 / 1024 AS lag_mb,
  (pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)::float /
   (1024 * 1024 * 16))::int AS estimated_wal_segments_behind
FROM pg_stat_replication;

-- Alert if lag > 100MB
SELECT * FROM replication_status WHERE lag_mb > 100;

-- Check replication slot disk usage
SELECT
  slot_name,
  pg_size_pretty(
    pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)
  ) as retained_wal
FROM pg_replication_slots;
```

## Troubleshooting

```sql
-- Replication broken?
-- 1. Check pg_stat_replication on primary
SELECT * FROM pg_stat_replication;

-- 2. Check logs on standby
-- tail -f /var/log/postgresql/postgresql-14-main.log

-- 3. Check replication slot exists
SELECT * FROM pg_replication_slots WHERE slot_name = 'replica_1';

-- 4. Recreate slot if missing
SELECT pg_create_physical_replication_slot('replica_1');

-- 5. Check WAL files available
-- ls -lh /var/lib/postgresql/14/main/pg_wal/

-- Standby too far behind?
-- Option 1: Increase wal_keep_size
-- Option 2: Use replication slots
-- Option 3: Re-run pg_basebackup
```
