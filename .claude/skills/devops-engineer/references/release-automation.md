# Release Automation

## Artifact Management

### Container Registry Lifecycle

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 prod images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["prod-"],
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {"type": "expire"}
    },
    {
      "rulePriority": 2,
      "description": "Remove untagged after 7 days",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 7
      },
      "action": {"type": "expire"}
    }
  ]
}
```

### Artifact Promotion

```yaml
# .github/workflows/promote.yml
name: Artifact Promotion

on:
  workflow_dispatch:
    inputs:
      image_tag:
        required: true
      target_env:
        type: choice
        options: [staging, production]

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - name: Re-tag for environment
        run: |
          docker pull $REGISTRY/$IMAGE:${{ inputs.image_tag }}
          docker tag $REGISTRY/$IMAGE:${{ inputs.image_tag }} \
            $REGISTRY/$IMAGE:${{ inputs.target_env }}-latest
          docker push $REGISTRY/$IMAGE:${{ inputs.target_env }}-latest

      - name: Sign artifact
        uses: sigstore/cosign-installer@v3
      - run: cosign sign $REGISTRY/$IMAGE:${{ inputs.target_env }}-latest

      - name: Update GitOps
        run: |
          cd gitops/apps/${{ inputs.target_env }}
          yq e '.image.tag = "${{ inputs.image_tag }}"' -i values.yaml
          git commit -am "Promote to ${{ inputs.target_env }}"
          git push
```

## Feature Flags

### LaunchDarkly Integration

```python
import launchdarkly

ld = launchdarkly.get()

def should_enable(user_id, feature_key):
    user = {"key": user_id, "custom": {"groups": get_groups(user_id)}}
    return ld.variation(feature_key, user, False)

# Usage
if should_enable(user.id, "new-payment-flow"):
    return new_payment_service.process(payment)
else:
    return legacy_payment_service.process(payment)
```

### Flagger Progressive Delivery

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: payment-service
spec:
  targetRef:
    kind: Deployment
    name: payment-service
  service:
    port: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
      - name: request-duration
        thresholdRange:
          max: 500
    webhooks:
      - name: load-test
        url: http://flagger-loadtester/
        metadata:
          cmd: "hey -z 1m -q 10 http://payment-canary/"
```

## Multi-Platform CI/CD

### GitLab CI

```yaml
stages: [test, build, deploy]

test:
  stage: test
  image: node:20
  script:
    - npm ci && npm test

build:
  stage: build
  image: docker:latest
  services: [docker:dind]
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

deploy:production:
  stage: deploy
  script:
    - kubectl set image deployment/app app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  environment: production
  when: manual
  only: [main]
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any

    environment {
        IMAGE = "registry.example.com/app"
    }

    stages {
        stage('Test') {
            steps {
                sh 'npm ci && npm test'
                junit 'reports/junit.xml'
            }
        }

        stage('Build') {
            steps {
                script {
                    docker.build("${IMAGE}:${BUILD_NUMBER}")
                }
            }
        }

        stage('Security Scan') {
            steps {
                sh "trivy image ${IMAGE}:${BUILD_NUMBER}"
            }
        }

        stage('Deploy Staging') {
            when { branch 'main' }
            steps {
                sh "kubectl set image deployment/app app=${IMAGE}:${BUILD_NUMBER} -n staging"
            }
        }

        stage('Deploy Production') {
            when { branch 'main' }
            steps {
                input 'Deploy to production?'
                sh "kubectl set image deployment/app app=${IMAGE}:${BUILD_NUMBER} -n production"
            }
        }
    }

    post {
        failure {
            slackSend color: 'danger', message: "Build failed: ${JOB_NAME}"
        }
    }
}
```

## Build Optimization

### Multi-stage Docker Build

```dockerfile
FROM node:20 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
USER node
CMD ["node", "dist/main.js"]
```

### Parallel Testing

```yaml
# CircleCI
version: 2.1
jobs:
  test:
    parallelism: 4
    docker:
      - image: cimg/node:20
    steps:
      - checkout
      - run: npm ci
      - run: |
          TESTS=$(circleci tests glob "test/**/*.js" | circleci tests split)
          npm test $TESTS
```

## Release Orchestration

```bash
#!/bin/bash
# release.sh - Multi-service coordinated release

VERSION=$1
SERVICES=(auth api worker frontend)

echo "Release: $VERSION"

# Create release branches
for svc in "${SERVICES[@]}"; do
    gh api repos/org/$svc/git/refs -f ref=refs/heads/release/$VERSION -f sha=$(git rev-parse main)
done

# Trigger builds
for svc in "${SERVICES[@]}"; do
    gh workflow run ci.yml --repo org/$svc --ref release/$VERSION
done

# Wait for completion
for svc in "${SERVICES[@]}"; do
    gh run watch --repo org/$svc $(gh run list --repo org/$svc -L1 -q '.[0].databaseId')
done

# Deploy to staging
kubectl apply -f staging/release-$VERSION.yaml

# Smoke tests
./scripts/smoke-test.sh staging

echo "✓ Release $VERSION ready for production"
```

## Dependency Management

### Renovate Auto-Update

```json
{
  "extends": ["config:base"],
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true
    },
    {
      "matchDepTypes": ["devDependencies"],
      "automerge": true
    }
  ],
  "schedule": ["before 6am on Monday"],
  "prConcurrentLimit": 5
}
```

## Build Optimization

### Build Caching Strategy

```yaml
# GitHub Actions: Multi-layer caching
- name: Cache dependencies
  uses: actions/cache@v3
  with:
    path: |
      ~/.npm
      ~/.cache
      node_modules
    key: ${{ runner.os }}-deps-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-deps-

- name: Cache Docker layers
  uses: docker/build-push-action@v4
  with:
    context: .
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### Parallel CI Pipeline

```yaml
# Multi-platform builds in parallel
name: Build

on: [push]

jobs:
  test:
    strategy:
      matrix:
        node: [18, 20, 22]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci && npm test

  build-images:
    needs: test
    strategy:
      matrix:
        platform: [linux/amd64, linux/arm64]
    runs-on: ubuntu-latest
    steps:
      - uses: docker/build-push-action@v4
        with:
          platforms: ${{ matrix.platform }}
          tags: app:${{ github.sha }}
```

## Multi-Service Release Orchestration

```yaml
# release-coordinator.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: release-v2.5.0
spec:
  template:
    spec:
      containers:
        - name: coordinator
          image: release-bot:latest
          env:
            - name: RELEASE_VERSION
              value: "v2.5.0"
            - name: SERVICES
              value: "auth,api,worker,frontend"
          command:
            - /bin/bash
            - -c
            - |
              # Deploy in dependency order
              for svc in auth api worker frontend; do
                echo "Deploying $svc..."
                kubectl set image deploy/$svc \
                  $svc=registry.io/$svc:$RELEASE_VERSION

                kubectl rollout status deploy/$svc --timeout=5m

                # Health check
                kubectl run test-$svc --rm -i --restart=Never \
                  --image=curlimages/curl -- \
                  curl -f http://$svc/health

                echo "$svc deployed successfully"
              done
```

## Advanced Artifact Management

```bash
#!/bin/bash
# artifact-scanner.sh - Scan before promotion

IMAGE=$1
SEVERITY=${2:-HIGH}

# Vulnerability scan
trivy image --severity $SEVERITY --exit-code 1 $IMAGE

# License compliance
syft $IMAGE -o json | \
  jq '.artifacts[].licenses[] | select(.value |
    contains("GPL") or contains("AGPL"))' && \
  echo "License violation detected" && exit 1

# SBOM generation
syft $IMAGE -o spdx-json > sbom-$(basename $IMAGE).spdx.json

# Sign artifact
cosign sign --key cosign.key $IMAGE

# Promote
docker tag $IMAGE $IMAGE-approved
docker push $IMAGE-approved

echo "Artifact $IMAGE approved and promoted"
```

## Zero-Downtime Database Migrations

```python
# migrations/release_v2.5.py
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Step 1: Add new column (nullable)
    op.add_column('users',
      sa.Column('email_verified', sa.Boolean(), nullable=True))

    # Step 2: Backfill data (in batches)
    connection = op.get_bind()
    connection.execute("""
      UPDATE users SET email_verified = true
      WHERE email IS NOT NULL
      LIMIT 1000
    """)
    # Repeat until complete (or use background job)

    # Step 3: Make non-nullable (in next release)
    # op.alter_column('users', 'email_verified', nullable=False)

def downgrade():
    op.drop_column('users', 'email_verified')
```

## Release Metrics Dashboard

```yaml
# Grafana dashboard for release metrics
apiVersion: v1
kind: ConfigMap
metadata:
  name: release-dashboard
data:
  dashboard.json: |
    {
      "panels": [
        {
          "title": "Deployment Frequency",
          "targets": [{
            "expr": "count_over_time(deployment_completed[1d])"
          }]
        },
        {
          "title": "Lead Time",
          "targets": [{
            "expr": "histogram_quantile(0.95, commit_to_deploy_seconds_bucket)"
          }]
        },
        {
          "title": "Change Failure Rate",
          "targets": [{
            "expr": "sum(rate(deployment_failed[1h])) / sum(rate(deployment_total[1h]))"
          }]
        },
        {
          "title": "Active Releases",
          "targets": [{
            "expr": "count(release_in_progress == 1)"
          }]
        }
      ]
    }
```

## Best Practices

- Version artifacts with immutable tags
- Implement retention policies
- Use progressive delivery for high-risk changes
- Automate security scanning
- Maintain deployment audit trails
- Enable easy rollbacks
- Monitor deployment metrics
- Use feature flags for flexibility
- Cache aggressively for fast builds
- Parallelize test and build jobs
- Coordinate multi-service releases
- Generate and track SBOMs
- Sign artifacts for supply chain security
- Automate dependency updates
- Track DORA metrics continuously
