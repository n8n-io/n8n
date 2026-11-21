# Platform Engineering

## Platform Principles

- **Self-service first**: Reduce manual work to <10%
- **Golden paths**: Pre-approved, opinionated templates
- **Developer experience**: Measure and optimize productivity
- **Platform as product**: Treat with product mindset

## Self-Service with Crossplane

```yaml
# Composition for self-service database
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: postgres-database
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Database
  resources:
    - name: rds-instance
      base:
        apiVersion: rds.aws.crossplane.io/v1alpha1
        kind: DBInstance
        spec:
          forProvider:
            dbInstanceClass: db.t3.micro
            engine: postgres
            engineVersion: "15"
            masterUsername: admin
            allocatedStorage: 20
```

## Terraform Self-Service Module

```hcl
# modules/service/main.tf
variable "service_name" {}
variable "environment" {}

module "k8s_service" {
  source   = "./k8s-deployment"
  name     = var.service_name
  env      = var.environment
}

module "database" {
  source = "./postgres"
  name   = "${var.service_name}-db"
}

module "monitoring" {
  source  = "./monitoring-stack"
  service = var.service_name
}

output "service_url" {
  value = module.k8s_service.url
}
```

## Backstage Service Template

```yaml
# templates/microservice/template.yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: microservice-template
  title: Microservice Golden Path
spec:
  owner: platform-team
  type: service
  parameters:
    - title: Service Info
      properties:
        name:
          type: string
        owner:
          type: string
          ui:field: OwnerPicker
        language:
          type: string
          enum: [go, python, nodejs, java]
  steps:
    - id: fetch
      action: fetch:template
      input:
        url: ./skeleton
        values:
          name: ${{ parameters.name }}
    - id: publish
      action: publish:github
      input:
        repoUrl: github.com?owner=org&repo=${{ parameters.name }}
    - id: register
      action: catalog:register
```

## Service Catalog Info

```yaml
# catalog-info.yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-service
  annotations:
    github.com/project-slug: org/payment-service
    pagerduty.com/integration-key: abc123
    grafana/dashboard-selector: service=payment
spec:
  type: service
  lifecycle: production
  owner: payments-team
  system: checkout
  dependsOn:
    - resource:default/payment-db
    - component:default/auth-service
  providesApis:
    - payment-api
```

## Golden Path Scaffolding

```bash
#!/bin/bash
# create-service.sh - Golden path for new services

SERVICE=$1
LANG=$2

# Create from template
gh repo create "org/$SERVICE" --template "org/template-$LANG"
git clone "git@github.com:org/$SERVICE.git"
cd "$SERVICE"

# Setup CI/CD
cat > .github/workflows/ci.yml <<EOF
name: CI/CD
on: [push]
jobs:
  pipeline:
    uses: org/workflows/.github/workflows/standard.yml@v1
    with:
      service_name: $SERVICE
EOF

# Create infrastructure
cat > terraform/main.tf <<EOF
module "service" {
  source = "git::https://github.com/org/terraform//service"
  name   = "$SERVICE"
}
EOF

git add . && git commit -m "Golden path init" && git push

echo "✓ Service created! Merge to main to deploy."
```

## GitOps Repository Structure

```
gitops/
├── apps/
│   ├── production/
│   │   ├── payment-service/
│   │   └── auth-service/
│   └── staging/
│       └── payment-service/
├── infrastructure/
│   ├── clusters/
│   │   ├── prod-us-east/
│   │   └── prod-eu-west/
│   └── base/
│       ├── ingress/
│       └── monitoring/
└── platform/
    ├── backstage/
    ├── argocd/
    └── vault/
```

## ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service
spec:
  project: default
  source:
    repoURL: https://github.com/org/gitops
    path: apps/production/payment-service
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    retry:
      limit: 5
      backoff:
        duration: 5s
        maxDuration: 3m
```

## Platform Metrics

```yaml
# prometheus/platform-metrics.yaml
groups:
  - name: platform
    rules:
      # Self-service adoption rate
      - record: platform:self_service:rate
        expr: |
          sum(rate(platform_provision_automated[1h]))
          /
          sum(rate(platform_provision_total[1h]))

      # Provisioning time P95
      - record: platform:provision:p95
        expr: |
          histogram_quantile(0.95,
            rate(platform_provision_duration_bucket[5m]))

      # Golden path adoption
      - record: platform:golden_path:adoption
        expr: |
          count(service{template="golden-path"})
          / count(service)
```

## Custom Backstage Plugin

```typescript
// plugins/platform-stats/PlatformMetrics.tsx
import React from 'react';
import { InfoCard, Progress } from '@backstage/core-components';

export const PlatformMetrics = () => {
  const metrics = {
    selfServiceRate: 92,
    avgProvisionTime: '3.5min',
    uptime: '99.95%',
    satisfaction: 4.6
  };

  return (
    <InfoCard title="Platform Health">
      <Progress value={metrics.selfServiceRate} label="Self-Service" />
      <p>Provision Time: {metrics.avgProvisionTime}</p>
      <p>Uptime: {metrics.uptime}</p>
      <p>Satisfaction: {metrics.satisfaction}/5</p>
    </InfoCard>
  );
};
```

## Cost Allocation

```yaml
# kubecost/allocation.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cost-allocation
data:
  allocation.json: |
    {
      "defaultLabels": {
        "team": "team",
        "service": "app",
        "environment": "env"
      },
      "shareNamespaces": ["kube-system"],
      "shareCost": "weighted"
    }
```

## Platform APIs

```python
# Platform API for self-service provisioning
from fastapi import FastAPI, Depends
from pydantic import BaseModel

app = FastAPI()

class ServiceRequest(BaseModel):
    name: str
    environment: str
    language: str
    database: bool = False

@app.post("/api/v1/services")
async def create_service(request: ServiceRequest):
    # Validate and enqueue
    task = platform.provision_service(
        name=request.name,
        env=request.environment,
        template=f"golden-path-{request.language}"
    )
    return {"task_id": task.id, "status": "provisioning"}

@app.get("/api/v1/services/{name}/status")
async def service_status(name: str):
    return {
        "status": "running",
        "url": f"https://{name}.example.com",
        "health": "healthy",
        "cost_mtd": "$142.50"
    }
```

## Multi-Tenant Architecture

```yaml
# Policy: Resource quotas per tenant
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: team-payments
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    persistentvolumeclaims: "10"
    services.loadbalancers: "2"
---
# RBAC: Namespace admin
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-admin
  namespace: team-payments
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: namespace-admin
subjects:
  - kind: Group
    name: team-payments
```

## Adoption Strategy

```yaml
# Platform metrics tracking
apiVersion: v1
kind: ConfigMap
metadata:
  name: platform-goals
data:
  goals.yaml: |
    q1_2024:
      self_service_rate: 90%
      avg_provision_time: 5min
      developer_satisfaction: 4.5/5
      golden_path_adoption: 80%

    tracking:
      weekly_provisioning: true
      team_feedback: true
      support_tickets: true
      training_completion: true
```

## CLI Tool Example

```bash
#!/bin/bash
# platform-cli - Self-service CLI

platform() {
  case $1 in
    create)
      curl -X POST $PLATFORM_API/services \
        -d "{\"name\":\"$2\",\"env\":\"$3\",\"language\":\"$4\"}"
      ;;
    status)
      curl $PLATFORM_API/services/$2/status | jq
      ;;
    logs)
      kubectl logs -l app=$2 -n ${3:-staging} --tail=100
      ;;
    cost)
      curl $PLATFORM_API/services/$2/cost?period=mtd
      ;;
  esac
}
```

## Best Practices

- Design for self-service from day one
- Make golden paths the easiest option
- Measure developer satisfaction continuously
- Automate platform operations
- Provide excellent documentation
- Build APIs, not just tools
- Enable safe experimentation
- Maintain backward compatibility
- Treat platform as a product
- Gather and act on feedback
- Track adoption metrics weekly
- Run platform as a product team
- Invest in developer evangelism
- Maintain SLOs for platform uptime
- Provide fast, helpful support
