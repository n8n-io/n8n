{{/*
Expand the name of the chart.
*/}}
{{- define "n8n.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "n8n.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "n8n.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "n8n.labels" -}}
helm.sh/chart: {{ include "n8n.chart" . }}
{{ include "n8n.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "n8n.selectorLabels" -}}
app.kubernetes.io/name: {{ include "n8n.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "n8n.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "n8n.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create the name of the config map
*/}}
{{- define "n8n.configMapName" -}}
{{- printf "%s-config" (include "n8n.fullname" .) }}
{{- end }}

{{/*
Create the name of the secret
*/}}
{{- define "n8n.secretName" -}}
{{- printf "%s-secret" (include "n8n.fullname" .) }}
{{- end }}

{{/*
Create the name of the database secret
*/}}
{{- define "n8n.dbSecretName" -}}
{{- printf "%s-db" (include "n8n.fullname" .) }}
{{- end }}

{{/*
Create the name of the redis secret
*/}}
{{- define "n8n.redisSecretName" -}}
{{- printf "%s-redis" (include "n8n.fullname" .) }}
{{- end }}

{{/*
Create the name of the n8n secret
*/}}
{{- define "n8n.n8nSecretName" -}}
{{- printf "%s-n8n-secret" (include "n8n.fullname" .) }}
{{- end }}

{{/*
Create the name of the PVC
*/}}
{{- define "n8n.pvcName" -}}
{{- printf "%s-data" (include "n8n.fullname" .) }}
{{- end }}

{{/*
Get the image name
*/}}
{{- define "n8n.image" -}}
{{- if .Values.global.imageRegistry }}
{{- printf "%s/%s:%s" .Values.global.imageRegistry .Values.image.repository (.Values.image.tag | default .Chart.AppVersion) }}
{{- else }}
{{- printf "%s/%s:%s" .Values.image.registry .Values.image.repository (.Values.image.tag | default .Chart.AppVersion) }}
{{- end }}
{{- end }}

{{/*
Create environment variables for database configuration
*/}}
{{- define "n8n.databaseEnvVars" -}}
{{- if eq .Values.database.type "postgresdb" }}
- name: DB_TYPE
  value: "postgresdb"
- name: DB_POSTGRESDB_HOST
  value: {{ .Values.database.postgresql.host | quote }}
- name: DB_POSTGRESDB_PORT
  value: {{ .Values.database.postgresql.port | quote }}
- name: DB_POSTGRESDB_DATABASE
  value: {{ .Values.database.postgresql.database | quote }}
- name: DB_POSTGRESDB_USER
  value: {{ .Values.database.postgresql.user | quote }}
{{- if .Values.database.postgresql.password }}
- name: DB_POSTGRESDB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "n8n.dbSecretName" . }}
      key: password
{{- end }}
- name: DB_POSTGRESDB_SCHEMA
  value: {{ .Values.database.postgresql.schema | quote }}
- name: DB_POSTGRESDB_POOL_SIZE
  value: {{ .Values.database.postgresql.poolSize | quote }}
- name: DB_POSTGRESDB_CONNECTION_TIMEOUT
  value: {{ .Values.database.postgresql.connectionTimeoutMs | quote }}
- name: DB_POSTGRESDB_IDLE_CONNECTION_TIMEOUT
  value: {{ .Values.database.postgresql.idleTimeoutMs | quote }}
{{- if .Values.database.postgresql.ssl.enabled }}
- name: DB_POSTGRESDB_SSL_ENABLED
  value: "true"
{{- if .Values.database.postgresql.ssl.ca }}
- name: DB_POSTGRESDB_SSL_CA
  value: {{ .Values.database.postgresql.ssl.ca | quote }}
{{- end }}
{{- if .Values.database.postgresql.ssl.cert }}
- name: DB_POSTGRESDB_SSL_CERT
  value: {{ .Values.database.postgresql.ssl.cert | quote }}
{{- end }}
{{- if .Values.database.postgresql.ssl.key }}
- name: DB_POSTGRESDB_SSL_KEY
  value: {{ .Values.database.postgresql.ssl.key | quote }}
{{- end }}
- name: DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED
  value: {{ .Values.database.postgresql.ssl.rejectUnauthorized | quote }}
{{- end }}
{{- else if eq .Values.database.type "mysqldb" }}
- name: DB_TYPE
  value: "mysqldb"
- name: DB_MYSQLDB_HOST
  value: {{ .Values.database.mysql.host | quote }}
- name: DB_MYSQLDB_PORT
  value: {{ .Values.database.mysql.port | quote }}
- name: DB_MYSQLDB_DATABASE
  value: {{ .Values.database.mysql.database | quote }}
- name: DB_MYSQLDB_USER
  value: {{ .Values.database.mysql.user | quote }}
{{- if .Values.database.mysql.password }}
- name: DB_MYSQLDB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "n8n.dbSecretName" . }}
      key: password
{{- end }}
{{- else }}
- name: DB_TYPE
  value: "sqlite"
- name: DB_SQLITE_DATABASE
  value: {{ .Values.database.sqlite.database | quote }}
- name: DB_SQLITE_POOL_SIZE
  value: {{ .Values.database.sqlite.poolSize | quote }}
- name: DB_SQLITE_ENABLE_WAL
  value: {{ .Values.database.sqlite.enableWAL | quote }}
- name: DB_SQLITE_VACUUM_ON_STARTUP
  value: {{ .Values.database.sqlite.executeVacuumOnStartup | quote }}
{{- end }}
{{- if .Values.database.tablePrefix }}
- name: DB_TABLE_PREFIX
  value: {{ .Values.database.tablePrefix | quote }}
{{- end }}
- name: DB_PING_INTERVAL_SECONDS
  value: {{ .Values.database.pingIntervalSeconds | quote }}
{{- if .Values.database.logging.enabled }}
- name: DB_LOGGING_ENABLED
  value: "true"
- name: DB_LOGGING_OPTIONS
  value: {{ .Values.database.logging.options | quote }}
- name: DB_LOGGING_MAX_EXECUTION_TIME
  value: {{ .Values.database.logging.maxQueryExecutionTime | quote }}
{{- end }}
{{- end }}

{{/*
Create environment variables for Redis configuration
*/}}
{{- define "n8n.redisEnvVars" -}}
{{- if .Values.redis.enabled }}
- name: QUEUE_BULL_REDIS_HOST
  value: {{ .Values.redis.host | quote }}
- name: QUEUE_BULL_REDIS_PORT
  value: {{ .Values.redis.port | quote }}
{{- if .Values.redis.password }}
- name: QUEUE_BULL_REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "n8n.redisSecretName" . }}
      key: password
{{- end }}
- name: QUEUE_BULL_REDIS_DB
  value: {{ .Values.redis.db | quote }}
- name: N8N_REDIS_KEY_PREFIX
  value: {{ .Values.redis.keyPrefix | quote }}
{{- if .Values.redis.username }}
- name: QUEUE_BULL_REDIS_USERNAME
  value: {{ .Values.redis.username | quote }}
{{- end }}
{{- if .Values.redis.clusterNodes }}
- name: QUEUE_BULL_REDIS_CLUSTER_NODES
  value: {{ .Values.redis.clusterNodes | quote }}
{{- end }}
- name: QUEUE_BULL_REDIS_TLS
  value: {{ .Values.redis.tls | quote }}
- name: QUEUE_BULL_REDIS_DUALSTACK
  value: {{ .Values.redis.dualStack | quote }}
- name: QUEUE_BULL_REDIS_TIMEOUT_THRESHOLD
  value: {{ .Values.redis.timeoutThreshold | quote }}
{{- end }}
{{- end }}

{{/*
Create environment variables for generic configuration
*/}}
{{- define "n8n.genericEnvVars" -}}
- name: GENERIC_TIMEZONE
  value: {{ .Values.generic.timezone | quote }}
- name: N8N_RELEASE_TYPE
  value: {{ .Values.generic.releaseChannel | quote }}
- name: N8N_GRACEFUL_SHUTDOWN_TIMEOUT
  value: {{ .Values.generic.gracefulShutdownTimeout | quote }}
{{- end }}

{{/*
Create environment variables for security configuration
*/}}
{{- define "n8n.securityEnvVars" -}}
{{- if .Values.security.restrictFileAccessTo }}
- name: N8N_RESTRICT_FILE_ACCESS_TO
  value: {{ .Values.security.restrictFileAccessTo | quote }}
{{- end }}
- name: N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES
  value: {{ .Values.security.blockFileAccessToN8nFiles | quote }}
- name: N8N_SECURITY_AUDIT_DAYS_ABANDONED_WORKFLOW
  value: {{ .Values.security.daysAbandonedWorkflow | quote }}
- name: N8N_CONTENT_SECURITY_POLICY
  value: {{ .Values.security.contentSecurityPolicy | quote }}
- name: N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY
  value: {{ .Values.security.contentSecurityPolicyReportOnly | quote }}
- name: N8N_INSECURE_DISABLE_WEBHOOK_IFRAME_SANDBOX
  value: {{ .Values.security.disableIframeSandboxing | quote }}
{{- end }}

{{/*
Create environment variables for authentication configuration
*/}}
{{- define "n8n.authEnvVars" -}}
- name: N8N_SECURE_COOKIE
  value: {{ .Values.auth.cookie.secure | quote }}
- name: N8N_SAMESITE_COOKIE
  value: {{ .Values.auth.cookie.samesite | quote }}
{{- end }}

{{/*
Create environment variables for endpoints configuration
*/}}
{{- define "n8n.endpointsEnvVars" -}}
- name: N8N_PAYLOAD_SIZE_MAX
  value: {{ .Values.endpoints.payloadSizeMax | quote }}
- name: N8N_FORMDATA_FILE_SIZE_MAX
  value: {{ .Values.endpoints.formDataFileSizeMax | quote }}
- name: N8N_ENDPOINT_REST
  value: {{ .Values.endpoints.rest | quote }}
- name: N8N_ENDPOINT_FORM
  value: {{ .Values.endpoints.form | quote }}
- name: N8N_ENDPOINT_FORM_TEST
  value: {{ .Values.endpoints.formTest | quote }}
- name: N8N_ENDPOINT_FORM_WAIT
  value: {{ .Values.endpoints.formWaiting | quote }}
- name: N8N_ENDPOINT_WEBHOOK
  value: {{ .Values.endpoints.webhook | quote }}
- name: N8N_ENDPOINT_WEBHOOK_TEST
  value: {{ .Values.endpoints.webhookTest | quote }}
- name: N8N_ENDPOINT_WEBHOOK_WAIT
  value: {{ .Values.endpoints.webhookWaiting | quote }}
- name: N8N_ENDPOINT_MCP
  value: {{ .Values.endpoints.mcp | quote }}
- name: N8N_ENDPOINT_MCP_TEST
  value: {{ .Values.endpoints.mcpTest | quote }}
- name: N8N_DISABLE_UI
  value: {{ .Values.endpoints.disableUi | quote }}
- name: N8N_DISABLE_PRODUCTION_MAIN_PROCESS
  value: {{ .Values.endpoints.disableProductionWebhooksOnMainProcess | quote }}
{{- if .Values.endpoints.additionalNonUIRoutes }}
- name: N8N_ADDITIONAL_NON_UI_ROUTES
  value: {{ .Values.endpoints.additionalNonUIRoutes | quote }}
{{- end }}
{{- end }}

{{/*
Create environment variables for Prometheus metrics configuration
*/}}
{{- define "n8n.metricsEnvVars" -}}
{{- if .Values.endpoints.metrics.enable }}
- name: N8N_METRICS
  value: "true"
- name: N8N_METRICS_PREFIX
  value: {{ .Values.endpoints.metrics.prefix | quote }}
- name: N8N_METRICS_INCLUDE_DEFAULT_METRICS
  value: {{ .Values.endpoints.metrics.includeDefaultMetrics | quote }}
- name: N8N_METRICS_INCLUDE_WORKFLOW_ID_LABEL
  value: {{ .Values.endpoints.metrics.includeWorkflowIdLabel | quote }}
- name: N8N_METRICS_INCLUDE_NODE_TYPE_LABEL
  value: {{ .Values.endpoints.metrics.includeNodeTypeLabel | quote }}
- name: N8N_METRICS_INCLUDE_CREDENTIAL_TYPE_LABEL
  value: {{ .Values.endpoints.metrics.includeCredentialTypeLabel | quote }}
- name: N8N_METRICS_INCLUDE_API_ENDPOINTS
  value: {{ .Values.endpoints.metrics.includeApiEndpoints | quote }}
- name: N8N_METRICS_INCLUDE_API_PATH_LABEL
  value: {{ .Values.endpoints.metrics.includeApiPathLabel | quote }}
- name: N8N_METRICS_INCLUDE_API_METHOD_LABEL
  value: {{ .Values.endpoints.metrics.includeApiMethodLabel | quote }}
- name: N8N_METRICS_INCLUDE_API_STATUS_CODE_LABEL
  value: {{ .Values.endpoints.metrics.includeApiStatusCodeLabel | quote }}
- name: N8N_METRICS_INCLUDE_CACHE_METRICS
  value: {{ .Values.endpoints.metrics.includeCacheMetrics | quote }}
- name: N8N_METRICS_INCLUDE_MESSAGE_EVENT_BUS_METRICS
  value: {{ .Values.endpoints.metrics.includeMessageEventBusMetrics | quote }}
- name: N8N_METRICS_INCLUDE_QUEUE_METRICS
  value: {{ .Values.endpoints.metrics.includeQueueMetrics | quote }}
- name: N8N_METRICS_QUEUE_METRICS_INTERVAL
  value: {{ .Values.endpoints.metrics.queueMetricsInterval | quote }}
- name: N8N_METRICS_ACTIVE_WORKFLOW_METRIC_INTERVAL
  value: {{ .Values.endpoints.metrics.activeWorkflowCountInterval | quote }}
- name: N8N_METRICS_INCLUDE_WORKFLOW_NAME_LABEL
  value: {{ .Values.endpoints.metrics.includeWorkflowNameLabel | quote }}
{{- end }}
{{- end }}

{{/*
Create environment variables for executions configuration
*/}}
{{- define "n8n.executionsEnvVars" -}}
- name: EXECUTIONS_DATA_PRUNE
  value: {{ .Values.executions.pruneData | quote }}
- name: EXECUTIONS_DATA_MAX_AGE
  value: {{ .Values.executions.pruneDataMaxAge | quote }}
- name: EXECUTIONS_DATA_PRUNE_MAX_COUNT
  value: {{ .Values.executions.pruneDataMaxCount | quote }}
- name: EXECUTIONS_DATA_HARD_DELETE_BUFFER
  value: {{ .Values.executions.pruneDataHardDeleteBuffer | quote }}
- name: EXECUTIONS_DATA_PRUNE_HARD_DELETE_INTERVAL
  value: {{ .Values.executions.pruneDataIntervals.hardDelete | quote }}
- name: EXECUTIONS_DATA_PRUNE_SOFT_DELETE_INTERVAL
  value: {{ .Values.executions.pruneDataIntervals.softDelete | quote }}
- name: EXECUTIONS_MODE
  value: {{ .Values.executions.mode | quote }}
- name: OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS
  value: {{ .Values.executions.offloadManualExecutionsToWorkers | quote }}
{{- end }}

{{/*
Create environment variables for logging configuration
*/}}
{{- define "n8n.loggingEnvVars" -}}
- name: N8N_LOG_LEVEL
  value: {{ .Values.logging.level | quote }}
- name: N8N_LOG_OUTPUT
  value: {{ join "," .Values.logging.outputs | quote }}
- name: N8N_LOG_FORMAT
  value: {{ .Values.logging.format | quote }}
{{- if .Values.logging.scopes }}
- name: N8N_LOG_SCOPES
  value: {{ join "," .Values.logging.scopes | quote }}
{{- end }}
- name: N8N_LOG_FILE_COUNT_MAX
  value: {{ .Values.logging.file.fileCountMax | quote }}
- name: N8N_LOG_FILE_SIZE_MAX
  value: {{ .Values.logging.file.fileSizeMax | quote }}
- name: N8N_LOG_FILE_LOCATION
  value: {{ .Values.logging.file.location | quote }}
- name: N8N_LOG_CRON_ACTIVE_INTERVAL
  value: {{ .Values.logging.cron.activeInterval | quote }}
{{- end }}

{{/*
Create environment variables for workflows configuration
*/}}
{{- define "n8n.workflowsEnvVars" -}}
- name: WORKFLOWS_DEFAULT_NAME
  value: {{ .Values.workflows.defaultName | quote }}
- name: N8N_WORKFLOW_CALLER_POLICY_DEFAULT_OPTION
  value: {{ .Values.workflows.callerPolicyDefaultOption | quote }}
- name: N8N_WORKFLOW_ACTIVATION_BATCH_SIZE
  value: {{ .Values.workflows.activationBatchSize | quote }}
{{- end }}

{{/*
Create environment variables for user management configuration
*/}}
{{- define "n8n.userManagementEnvVars" -}}
- name: N8N_EMAIL_MODE
  value: {{ .Values.userManagement.emails.mode | quote }}
{{- if .Values.userManagement.emails.smtp.host }}
- name: N8N_SMTP_HOST
  value: {{ .Values.userManagement.emails.smtp.host | quote }}
- name: N8N_SMTP_PORT
  value: {{ .Values.userManagement.emails.smtp.port | quote }}
- name: N8N_SMTP_SSL
  value: {{ .Values.userManagement.emails.smtp.secure | quote }}
- name: N8N_SMTP_STARTTLS
  value: {{ .Values.userManagement.emails.smtp.startTLS | quote }}
{{- if .Values.userManagement.emails.smtp.sender }}
- name: N8N_SMTP_SENDER
  value: {{ .Values.userManagement.emails.smtp.sender | quote }}
{{- end }}
{{- if .Values.userManagement.emails.smtp.auth.user }}
- name: N8N_SMTP_USER
  value: {{ .Values.userManagement.emails.smtp.auth.user | quote }}
{{- end }}
{{- if .Values.userManagement.emails.smtp.auth.pass }}
- name: N8N_SMTP_PASS
  value: {{ .Values.userManagement.emails.smtp.auth.pass | quote }}
{{- end }}
{{- if .Values.userManagement.emails.smtp.auth.serviceClient }}
- name: N8N_SMTP_OAUTH_SERVICE_CLIENT
  value: {{ .Values.userManagement.emails.smtp.auth.serviceClient | quote }}
{{- end }}
{{- if .Values.userManagement.emails.smtp.auth.privateKey }}
- name: N8N_SMTP_OAUTH_PRIVATE_KEY
  value: {{ .Values.userManagement.emails.smtp.auth.privateKey | quote }}
{{- end }}
{{- end }}
{{- if .Values.userManagement.emails.template.userInvited }}
- name: N8N_UM_EMAIL_TEMPLATES_INVITE
  value: {{ .Values.userManagement.emails.template.userInvited | quote }}
{{- end }}
{{- if .Values.userManagement.emails.template.passwordResetRequested }}
- name: N8N_UM_EMAIL_TEMPLATES_PWRESET
  value: {{ .Values.userManagement.emails.template.passwordResetRequested | quote }}
{{- end }}
{{- if .Values.userManagement.emails.template.workflowShared }}
- name: N8N_UM_EMAIL_TEMPLATES_WORKFLOW_SHARED
  value: {{ .Values.userManagement.emails.template.workflowShared | quote }}
{{- end }}
{{- if .Values.userManagement.emails.template.credentialsShared }}
- name: N8N_UM_EMAIL_TEMPLATES_CREDENTIALS_SHARED
  value: {{ .Values.userManagement.emails.template.credentialsShared | quote }}
{{- end }}
{{- if .Values.userManagement.emails.template.projectShared }}
- name: N8N_UM_EMAIL_TEMPLATES_PROJECT_SHARED
  value: {{ .Values.userManagement.emails.template.projectShared | quote }}
{{- end }}
{{- end }}

{{/*
Create environment variables for basic authentication
*/}}
{{- define "n8n.basicAuthEnvVars" -}}
{{- if .Values.basicAuth.active }}
- name: N8N_BASIC_AUTH_ACTIVE
  value: "true"
- name: N8N_BASIC_AUTH_USER
  value: {{ .Values.basicAuth.user | quote }}
- name: N8N_BASIC_AUTH_PASSWORD
  value: {{ .Values.basicAuth.password | quote }}
{{- end }}
{{- end }}

{{/*
Create environment variables for webhook configuration
*/}}
{{- define "n8n.webhookEnvVars" -}}
{{- if .Values.webhook.url }}
- name: N8N_WEBHOOK_URL
  value: {{ .Values.webhook.url | quote }}
{{- end }}
{{- if .Values.webhook.testUrl }}
- name: N8N_WEBHOOK_TEST_URL
  value: {{ .Values.webhook.testUrl | quote }}
{{- end }}
{{- end }}

{{/*
Create environment variables for encryption and JWT
*/}}
{{- define "n8n.encryptionEnvVars" -}}
{{- if .Values.encryption.key }}
- name: N8N_ENCRYPTION_KEY
  value: {{ .Values.encryption.key | quote }}
{{- end }}
{{- if .Values.jwt.secret }}
- name: N8N_JWT_SECRET
  value: {{ .Values.jwt.secret | quote }}
{{- end }}
{{- end }}

{{/*
Create environment variables for scaling mode configuration
*/}}
{{- define "n8n.scalingEnvVars" -}}
{{- if .Values.scaling.enabled }}
- name: QUEUE_HEALTH_CHECK_ACTIVE
  value: {{ .Values.scaling.health.active | quote }}
- name: QUEUE_HEALTH_CHECK_PORT
  value: {{ .Values.scaling.health.port | quote }}
- name: N8N_WORKER_SERVER_ADDRESS
  value: {{ .Values.scaling.health.address | quote }}
- name: QUEUE_BULL_PREFIX
  value: {{ .Values.scaling.bull.prefix | quote }}
- name: QUEUE_WORKER_TIMEOUT
  value: {{ .Values.scaling.bull.gracefulShutdownTimeout | quote }}
- name: QUEUE_WORKER_LOCK_DURATION
  value: {{ .Values.scaling.bull.settings.lockDuration | quote }}
- name: QUEUE_WORKER_LOCK_RENEW_TIME
  value: {{ .Values.scaling.bull.settings.lockRenewTime | quote }}
- name: QUEUE_WORKER_STALLED_INTERVAL
  value: {{ .Values.scaling.bull.settings.stalledInterval | quote }}
- name: QUEUE_WORKER_MAX_STALLED_COUNT
  value: {{ .Values.scaling.bull.settings.maxStalledCount | quote }}
{{- end }}
{{- end }}

{{/*
Create environment variables for multi-main setup configuration
*/}}
{{- define "n8n.multiMainEnvVars" -}}
{{- if .Values.multiMain.enabled }}
- name: N8N_MULTI_MAIN_SETUP_ENABLED
  value: "true"
- name: N8N_MULTI_MAIN_SETUP_KEY_TTL
  value: {{ .Values.multiMain.ttl | quote }}
- name: N8N_MULTI_MAIN_SETUP_CHECK_INTERVAL
  value: {{ .Values.multiMain.interval | quote }}
{{- end }}
{{- end }}

{{/*
Create environment variables for task runners configuration
*/}}
{{- define "n8n.taskRunnersEnvVars" -}}
{{- if .Values.taskRunners.enabled }}
- name: N8N_RUNNERS_ENABLED
  value: "true"
- name: N8N_RUNNERS_MODE
  value: {{ .Values.taskRunners.mode | quote }}
- name: N8N_RUNNERS_PATH
  value: {{ .Values.taskRunners.path | quote }}
{{- if .Values.taskRunners.authToken }}
- name: N8N_RUNNERS_AUTH_TOKEN
  value: {{ .Values.taskRunners.authToken | quote }}
{{- end }}
- name: N8N_RUNNERS_BROKER_PORT
  value: {{ .Values.taskRunners.brokerPort | quote }}
- name: N8N_RUNNERS_BROKER_LISTEN_ADDRESS
  value: {{ .Values.taskRunners.listenAddress | quote }}
- name: N8N_RUNNERS_MAX_PAYLOAD
  value: {{ .Values.taskRunners.maxPayload | quote }}
{{- if .Values.taskRunners.maxOldSpaceSize }}
- name: N8N_RUNNERS_MAX_OLD_SPACE_SIZE
  value: {{ .Values.taskRunners.maxOldSpaceSize | quote }}
{{- end }}
- name: N8N_RUNNERS_MAX_CONCURRENCY
  value: {{ .Values.taskRunners.maxConcurrency | quote }}
- name: N8N_RUNNERS_TASK_TIMEOUT
  value: {{ .Values.taskRunners.taskTimeout | quote }}
- name: N8N_RUNNERS_HEARTBEAT_INTERVAL
  value: {{ .Values.taskRunners.heartbeatInterval | quote }}
- name: N8N_RUNNERS_INSECURE_MODE
  value: {{ .Values.taskRunners.insecureMode | quote }}
{{- end }}
{{- end }} 