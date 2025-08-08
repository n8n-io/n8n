# n8n Helm Chart

A Helm chart for deploying [n8n](https://n8n.io/) - a fair-code licensed workflow automation tool that combines AI capabilities with business process automation.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- PV provisioner support in the underlying infrastructure

## Installation

### Add the Helm repository

```bash
helm repo add n8n https://n8n-io.github.io/helm-charts
helm repo update
```

### Install the chart

```bash
# Install with default values
helm install my-n8n n8n/n8n

# Install with custom values
helm install my-n8n n8n/n8n -f values.yaml

# Install in a specific namespace
helm install my-n8n n8n/n8n --namespace n8n --create-namespace
```

## Configuration

The following table lists the configurable parameters of the n8n chart and their default values.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.registry` | Docker registry | `docker.io` |
| `image.repository` | Docker image repository | `n8nio/n8n` |
| `image.tag` | Docker image tag | `1.106.0` |
| `image.pullPolicy` | Docker image pull policy | `IfNotPresent` |
| `replicaCount` | Number of n8n replicas | `1` |
| `service.type` | Kubernetes service type | `ClusterIP` |
| `service.port` | Kubernetes service port | `80` |
| `ingress.enabled` | Enable ingress | `false` |
| `persistence.enabled` | Enable persistence | `true` |
| `persistence.size` | PVC size | `10Gi` |
| `database.type` | Database type (sqlite, postgresdb, mysqldb) | `sqlite` |
| `resources.limits.cpu` | CPU limits | `1000m` |
| `resources.limits.memory` | Memory limits | `1Gi` |
| `resources.requests.cpu` | CPU requests | `250m` |
| `resources.requests.memory` | Memory requests | `512Mi` |

### Database Configuration

#### SQLite (Default)

```yaml
database:
  type: sqlite
  sqlite:
    database: "database.sqlite"
    poolSize: 0
    enableWAL: false
    executeVacuumOnStartup: false
```

#### PostgreSQL

```yaml
database:
  type: postgresdb
  postgresql:
    host: "postgres-service"
    port: 5432
    database: n8n
    user: n8n
    password: "your-password"
    schema: "public"
    poolSize: 2
    connectionTimeoutMs: 20000
    idleTimeoutMs: 30000
    ssl:
      enabled: false
      ca: ""
      cert: ""
      key: ""
      rejectUnauthorized: true
```

#### MySQL

```yaml
database:
  type: mysqldb
  mysql:
    host: "mysql-service"
    port: 3306
    database: n8n
    user: n8n
    password: "your-password"
```

### Redis Configuration

```yaml
redis:
  enabled: true
  host: "redis-service"
  port: 6379
  password: "your-redis-password"
  db: 0
  keyPrefix: "n8n"
```

### Basic Authentication

```yaml
basicAuth:
  active: true
  user: "admin"
  password: "your-password"
```

### Webhook Configuration

```yaml
webhook:
  url: "https://your-domain.com/webhook"
  testUrl: "https://your-domain.com/webhook-test"
```

### Security Configuration

```yaml
security:
  restrictFileAccessTo: "/home/node/.n8n;/home/node/n8n-data"
  blockFileAccessToN8nFiles: true
  daysAbandonedWorkflow: 90
  contentSecurityPolicy: '{"frame-ancestors": ["https://your-domain.com"]}'
  contentSecurityPolicyReportOnly: false
  disableIframeSandboxing: false
```

### Logging Configuration

```yaml
logging:
  level: "info"  # error, warn, info, debug, silent
  outputs: ["console", "file"]
  format: "json"  # text, json
  scopes: ["license", "waiting-executions"]
  file:
    fileCountMax: 100
    fileSizeMax: 16
    location: "logs/n8n.log"
  cron:
    activeInterval: 30
```

### Prometheus Metrics

```yaml
endpoints:
  metrics:
    enable: true
    prefix: "n8n_"
    includeDefaultMetrics: true
    includeWorkflowIdLabel: true
    includeNodeTypeLabel: true
    includeApiEndpoints: true
    includeQueueMetrics: true
```

### User Management (SMTP)

```yaml
userManagement:
  emails:
    mode: "smtp"
    smtp:
      host: "smtp.gmail.com"
      port: 587
      secure: false
      startTLS: true
      sender: "n8n@your-domain.com"
      auth:
        user: "your-email@gmail.com"
        pass: "your-app-password"
```

### Ingress Configuration

```yaml
ingress:
  enabled: true
  className: "nginx"
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: n8n.your-domain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: n8n-tls
      hosts:
        - n8n.your-domain.com
```

### Horizontal Pod Autoscaler

```yaml
hpa:
  enabled: true
  minReplicas: 1
  maxReplicas: 5
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 80
```

### Service Monitor (Prometheus)

```yaml
serviceMonitor:
  enabled: true
  interval: 30s
  scrapeTimeout: 10s
  path: /metrics
  port: http
```

## Examples

### Production Deployment with PostgreSQL

```yaml
# values-production.yaml
image:
  tag: "1.106.0"

replicaCount: 2

database:
  type: postgresdb
  postgresql:
    host: "postgres-service"
    port: 5432
    database: n8n
    user: n8n
    password: "your-secure-password"
    poolSize: 5
    ssl:
      enabled: true
      rejectUnauthorized: true

redis:
  enabled: true
  host: "redis-service"
  port: 6379
  password: "your-redis-password"

basicAuth:
  active: true
  user: "admin"
  password: "your-secure-password"

webhook:
  url: "https://n8n.your-domain.com/webhook"

security:
  restrictFileAccessTo: "/home/node/.n8n"
  contentSecurityPolicy: '{"frame-ancestors": ["https://n8n.your-domain.com"]}'

logging:
  level: "info"
  outputs: ["console", "file"]
  format: "json"

endpoints:
  metrics:
    enable: true
    includeQueueMetrics: true

hpa:
  enabled: true
  minReplicas: 2
  maxReplicas: 5

ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: n8n.your-domain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: n8n-tls
      hosts:
        - n8n.your-domain.com

serviceMonitor:
  enabled: true
```

Install with:

```bash
helm install n8n-prod n8n/n8n -f values-production.yaml --namespace n8n --create-namespace
```

### Development Deployment with SQLite

```yaml
# values-dev.yaml
image:
  tag: "1.106.0"

replicaCount: 1

database:
  type: sqlite
  sqlite:
    database: "database.sqlite"
    poolSize: 0

basicAuth:
  active: false

logging:
  level: "debug"
  outputs: ["console"]
  format: "text"

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 256Mi

ingress:
  enabled: true
  hosts:
    - host: n8n-dev.local
      paths:
        - path: /
          pathType: Prefix
```

Install with:

```bash
helm install n8n-dev n8n/n8n -f values-dev.yaml --namespace n8n-dev --create-namespace
```

## Upgrading

```bash
# Upgrade the release
helm upgrade my-n8n n8n/n8n

# Upgrade with custom values
helm upgrade my-n8n n8n/n8n -f values.yaml

# Check the status
helm status my-n8n
```

## Uninstalling

```bash
# Uninstall the release
helm uninstall my-n8n

# Remove the namespace (if created)
kubectl delete namespace n8n
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -l app.kubernetes.io/name=n8n
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### Check Services

```bash
kubectl get svc -l app.kubernetes.io/name=n8n
kubectl describe svc <service-name>
```

### Check Persistent Volumes

```bash
kubectl get pvc -l app.kubernetes.io/name=n8n
kubectl describe pvc <pvc-name>
```

### Common Issues

1. **Database Connection Issues**: Ensure the database service is running and accessible
2. **Persistent Volume Issues**: Check if your cluster supports the specified storage class
3. **Resource Limits**: Adjust CPU and memory limits based on your workload
4. **Ingress Issues**: Verify your ingress controller is properly configured

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This chart is licensed under the MIT License.

## Support

For support, please refer to:
- [n8n Documentation](https://docs.n8n.io/)
- [n8n Community Forum](https://community.n8n.io/)
- [n8n GitHub Issues](https://github.com/n8n-io/n8n/issues) 