# Unified Backup/Restore API System

This comprehensive backup system provides single-endpoint backup functionality for complete n8n instance backup and restoration, including workflows, credentials, settings, and binary data.

## Features

### ✅ Implemented Core Features
- **Single API Endpoint Backup**: Complete instance backup in one request
- **Atomic Restore Operations**: Rollback capability with transaction management
- **Binary Data Inclusion**: Support for backing up binary data (framework ready)
- **Backup Integrity Validation**: Checksum verification and integrity checks
- **Incremental Backup Support**: Framework for incremental backups (basic implementation)
- **Automated Backup Scheduling**: Configurable backup scheduling system

### 🔧 Components

#### BackupController (`/backup`)
REST API endpoints for backup management:
- `POST /backup/` - Create new backup
- `GET /backup/` - List all backups  
- `GET /backup/:id` - Get backup details
- `POST /backup/:id/restore` - Restore from backup
- `GET /backup/:id/download` - Download backup file
- `DELETE /backup/:id` - Delete backup
- `PATCH /backup/:id/verify` - Verify backup integrity
- `GET /backup/schedule/status` - Get schedule status
- `POST /backup/schedule` - Configure backup schedule

#### BackupService
Core backup functionality:
- Creates compressed backups with checksums
- Handles encryption with password protection
- Manages backup metadata and file structure
- Implements backup scheduling framework
- Validates backup integrity

#### RestoreService  
Atomic restore operations:
- Database transaction management
- Rollback capabilities for failed restores
- Conflict resolution (skip/overwrite/rename)
- Data validation and integrity checks

## API Usage Examples

### Create Basic Backup
```bash
curl -X POST http://localhost:5678/backup/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Backup",
    "description": "Automated daily backup",
    "includeCredentials": true,
    "includeSettings": true,
    "includeBinaryData": false
  }'
```

### Create Encrypted Backup
```bash
curl -X POST http://localhost:5678/backup/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Secure Backup",
    "encryption": true,
    "password": "your-secure-password",
    "includeCredentials": true,
    "includeSettings": true,
    "includeBinaryData": true
  }'
```

### List All Backups
```bash
curl -X GET http://localhost:5678/backup/
```

### Restore from Backup
```bash
curl -X POST http://localhost:5678/backup/backup-123/restore \
  -H "Content-Type: application/json" \
  -d '{
    "password": "your-password",
    "overwriteExisting": true,
    "validateIntegrity": true
  }'
```

### Download Backup
```bash
curl -X GET http://localhost:5678/backup/backup-123/download \
  -o my-backup.n8n-backup
```

### Verify Backup Integrity
```bash
curl -X PATCH http://localhost:5678/backup/backup-123/verify
```

### Configure Backup Schedule
```bash
curl -X POST http://localhost:5678/backup/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "0 2 * * *",
    "enabled": true,
    "backupOptions": {
      "includeCredentials": true,
      "includeSettings": true,
      "includeBinaryData": false
    }
  }'
```

## Response Examples

### Backup Creation Response
```json
{
  "id": "backup-2023-12-01T02-00-00-000Z-abc123",
  "name": "Daily Backup",
  "description": "Automated daily backup",
  "size": 2048576,
  "createdAt": "2023-12-01T02:00:00.000Z",
  "checksums": {
    "workflows": "a1b2c3d4e5f6...",
    "credentials": "f6e5d4c3b2a1...",
    "settings": "1a2b3c4d5e6f...",
    "overall": "6f5e4d3c2b1a..."
  },
  "metadata": {
    "workflowCount": 25,
    "credentialCount": 8,
    "settingsCount": 15,
    "binaryDataCount": 0,
    "version": "1.0.0",
    "encrypted": false
  },
  "downloadUrl": "/backup/backup-123/download"
}
```

### Restore Response
```json
{
  "success": true,
  "restored": {
    "workflows": 25,
    "credentials": 8,
    "settings": 15,
    "binaryData": 0
  },
  "conflicts": [
    {
      "type": "workflow",
      "name": "Existing Workflow",
      "action": "overwritten"
    }
  ],
  "duration": 5432,
  "backupId": "backup-123"
}
```

## Integration Requirements

### Database Dependencies
- WorkflowRepository
- CredentialsRepository  
- SettingsRepository
- InstalledPackagesRepository

### Service Dependencies
- BinaryDataService (for binary data backup/restore)
- Logger (for operational logging)
- InstanceSettings (for backup directory configuration)

### File System Requirements
- Backup storage directory: `{userFolder}/backups/`
- Write permissions for backup creation
- Sufficient disk space for backup storage

## Security Considerations

1. **Access Control**: All endpoints require appropriate global scopes
2. **Encryption**: Optional AES-256-CBC encryption for sensitive backups
3. **Password Protection**: Secure password handling for encrypted backups
4. **Integrity Validation**: SHA-256 checksums for all backup components
5. **Rollback Protection**: Transaction-based restore with automatic rollback on failure

## Testing

Comprehensive test suite includes:
- Unit tests for controllers and services
- Integration tests for backup/restore workflows
- Error handling and edge case testing
- Performance testing for large backups
- Security testing for encrypted backups

## Future Enhancements

1. **Binary Data Implementation**: Complete binary data backup/restore
2. **Advanced Scheduling**: Cron-based scheduling with retention policies
3. **Cloud Storage**: Integration with S3, Google Cloud, Azure storage
4. **Incremental Backups**: Efficient delta backups for large instances
5. **Backup Compression**: Advanced compression algorithms
6. **Audit Logging**: Detailed backup/restore audit trails

## Error Handling

The system provides comprehensive error handling:
- `BadRequestError` for invalid requests
- `NotFoundError` for missing backups
- `InternalServerError` for system failures
- Transaction rollback for failed operations
- Detailed error logging for troubleshooting