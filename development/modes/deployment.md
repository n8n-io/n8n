# DEPLOYMENT Mode Instructions

You are in DEPLOYMENT mode, focused on production deployment strategies, release management, and infrastructure automation with zero-downtime deployment patterns.

*Note: All core quality standards, subagent requirements, thinking escalation rules, and TaskManager workflows are in CLAUDE.md. This mode adds deployment-specific automation and release management frameworks only.*

## Deployment Strategy Framework

### 1. Deployment Risk Classification

#### Zero-Downtime Deployments (Standard Practice)
```
Characteristics:
├── Blue-Green deployment with health checks
├── Database migrations are backward compatible
├── Feature flags control new functionality rollout
├── Automated rollback triggers on failure detection
└── Load balancer traffic switching with validation

Risk Level: Low
Rollback Time: < 2 minutes
Validation: Automated health checks + smoke tests
```

#### High-Risk Deployments (Enhanced Safety Protocols)
```
Characteristics:
├── Database schema changes requiring coordination
├── Breaking API changes with version deprecation
├── Infrastructure changes affecting multiple services
├── Major architectural modifications
└── Third-party integration changes

Risk Level: High
Rollback Time: < 5 minutes
Validation: Comprehensive integration tests + manual verification
Approval: Technical lead + operations team sign-off
```

#### Emergency Hotfix Deployments (Expedited Process)
```
Characteristics:
├── Critical security vulnerabilities
├── Production-down incidents
├── Data integrity issues
├── Compliance violations
└── Customer-impacting bugs

Risk Level: Medium (due to urgency)
Rollback Time: < 1 minute
Validation: Focused testing on fix + production monitoring
Approval: On-call engineer + incident commander
```

### 2. Blue-Green Deployment Implementation

#### Infrastructure Setup Pattern
```yaml
# Blue-Green Deployment Configuration
apiVersion: v1
kind: Service
metadata:
  name: app-service
  labels:
    app: myapp
spec:
  selector:
    app: myapp
    version: blue  # Switch between 'blue' and 'green'
  ports:
    - port: 80
      targetPort: 3000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: blue
  template:
    metadata:
      labels:
        app: myapp
        version: blue
    spec:
      containers:
      - name: app
        image: myapp:v1.2.3
        ports:
        - containerPort: 3000
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

#### Automated Blue-Green Switching
```bash
#!/bin/bash
# Blue-Green Deployment Script

set -e

NEW_VERSION=$1
CURRENT_COLOR=$(kubectl get service app-service -o jsonpath='{.spec.selector.version}')
NEW_COLOR=$([ "$CURRENT_COLOR" = "blue" ] && echo "green" || echo "blue")

echo "Current deployment: $CURRENT_COLOR"
echo "Deploying to: $NEW_COLOR environment"

# Step 1: Deploy to inactive environment
kubectl set image deployment/app-$NEW_COLOR app=myapp:$NEW_VERSION

# Step 2: Wait for deployment to be ready
kubectl rollout status deployment/app-$NEW_COLOR --timeout=600s

# Step 3: Run health checks on new deployment
echo "Running health checks on $NEW_COLOR environment..."
kubectl wait --for=condition=available --timeout=300s deployment/app-$NEW_COLOR

# Step 4: Run integration tests
./run-integration-tests.sh $NEW_COLOR

# Step 5: Switch traffic to new environment
kubectl patch service app-service -p '{"spec":{"selector":{"version":"'$NEW_COLOR'"}}}'

echo "Traffic switched to $NEW_COLOR environment"

# Step 6: Monitor for issues (5 minute window)
echo "Monitoring deployment for 5 minutes..."
sleep 300

# Step 7: Verify deployment success
if ./verify-deployment-health.sh; then
    echo "Deployment successful!"
    # Clean up old environment
    kubectl scale deployment app-$CURRENT_COLOR --replicas=0
else
    echo "Deployment failed! Rolling back..."
    kubectl patch service app-service -p '{"spec":{"selector":{"version":"'$CURRENT_COLOR'"}}}'
    exit 1
fi
```

### 3. Canary Release Strategy

#### Progressive Traffic Splitting
```javascript
// Canary Deployment Configuration
const canaryConfig = {
  phases: [
    { name: 'initial', trafficPercent: 5, duration: '10m', successThreshold: 99.5 },
    { name: 'ramp-1', trafficPercent: 25, duration: '20m', successThreshold: 99.0 },
    { name: 'ramp-2', trafficPercent: 50, duration: '30m', successThreshold: 99.0 },
    { name: 'full', trafficPercent: 100, duration: '60m', successThreshold: 98.5 }
  ],
  
  rollbackTriggers: {
    errorRate: 1.0,          // Error rate above 1%
    responseTime: 2000,       // Response time above 2s
    httpErrors: 10,          // More than 10 5xx errors per minute
    customMetrics: {
      businessMetric: 0.95   // Business-specific success metric
    }
  },

  monitoringWindow: '5m',    // Evaluation window for metrics
  autoPromote: true,         // Automatically promote if thresholds met
  autoRollback: true         // Automatically rollback on failure
};

class CanaryDeployment {
  constructor(config) {
    this.config = config;
    this.currentPhase = 0;
    this.metrics = new MetricsCollector();
  }

  async deployCanary() {
    for (const phase of this.config.phases) {
      console.log(`Starting canary phase: ${phase.name} (${phase.trafficPercent}%)`);
      
      // Update traffic routing
      await this.updateTrafficSplit(phase.trafficPercent);
      
      // Monitor metrics for specified duration
      const success = await this.monitorPhase(phase);
      
      if (!success) {
        await this.rollbackCanary();
        throw new Error(`Canary deployment failed at phase: ${phase.name}`);
      }
    }
    
    console.log('Canary deployment completed successfully');
  }

  async monitorPhase(phase) {
    const endTime = Date.now() + this.parseDuration(phase.duration);
    
    while (Date.now() < endTime) {
      const metrics = await this.metrics.getLatestMetrics();
      
      if (this.shouldRollback(metrics)) {
        return false;
      }
      
      await this.sleep(30000); // Check every 30 seconds
    }
    
    // Final health check
    const finalMetrics = await this.metrics.getLatestMetrics();
    return finalMetrics.successRate >= phase.successThreshold;
  }
}
```

## Database Migration Strategies

### 1. Zero-Downtime Database Migrations

#### Backward-Compatible Migration Pattern
```sql
-- Phase 1: Add new column (backward compatible)
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;

-- Phase 2: Populate new column with data migration
UPDATE users 
SET email_verified = (
  SELECT COUNT(*) > 0 
  FROM email_verifications 
  WHERE email_verifications.user_id = users.id
);

-- Phase 3: Application deployment uses new column

-- Phase 4: Remove old verification table (after full rollout)
-- DROP TABLE email_verifications; -- Run this after confirming success
```

#### Database Migration Automation
```python
class DatabaseMigration:
    def __init__(self, db_connection):
        self.db = db_connection
        self.migration_lock = "migration_in_progress"
        
    def execute_safe_migration(self, migration_sql, rollback_sql):
        """Execute migration with automatic rollback on failure"""
        try:
            # Acquire migration lock
            self.acquire_lock()
            
            # Create savepoint
            self.db.execute("SAVEPOINT migration_point")
            
            # Execute migration
            self.db.execute(migration_sql)
            
            # Verify migration success
            if self.verify_migration():
                self.db.execute("COMMIT")
                print("Migration completed successfully")
            else:
                raise Exception("Migration verification failed")
                
        except Exception as e:
            print(f"Migration failed: {e}")
            self.db.execute("ROLLBACK TO SAVEPOINT migration_point")
            
            # Execute rollback if provided
            if rollback_sql:
                self.db.execute(rollback_sql)
                
            raise
        finally:
            self.release_lock()
    
    def verify_migration(self):
        """Verify migration completed successfully"""
        # Check table structure
        # Verify data integrity
        # Run test queries
        return True
```

### 2. Configuration Management

#### Environment-Specific Configuration
```yaml
# Production Configuration
production:
  database:
    host: prod-db-cluster.example.com
    port: 5432
    pool_size: 20
    timeout: 30s
    ssl_mode: require
    
  redis:
    cluster:
      - redis-1.prod.example.com:6379
      - redis-2.prod.example.com:6379
      - redis-3.prod.example.com:6379
    ssl: true
    timeout: 5s
    
  monitoring:
    metrics_endpoint: https://metrics.prod.example.com/api/v1
    log_level: warn
    error_reporting: sentry
    
  feature_flags:
    new_dashboard: true
    beta_features: false
    maintenance_mode: false

# Staging Configuration  
staging:
  database:
    host: staging-db.example.com
    port: 5432
    pool_size: 10
    timeout: 15s
    ssl_mode: prefer
    
  feature_flags:
    new_dashboard: true
    beta_features: true
    maintenance_mode: false
```

#### Secret Management Integration
```javascript
// Secure Configuration Management
class ConfigManager {
  constructor() {
    this.vault = new VaultClient({
      endpoint: process.env.VAULT_ENDPOINT,
      token: process.env.VAULT_TOKEN
    });
  }

  async loadConfiguration(environment) {
    const config = await this.loadBaseConfig(environment);
    
    // Load secrets from vault
    const secrets = await this.vault.read(`secret/${environment}/app`);
    
    // Merge configuration with secrets
    return {
      ...config,
      database: {
        ...config.database,
        password: secrets.data.db_password
      },
      api_keys: secrets.data.api_keys,
      encryption_keys: secrets.data.encryption_keys
    };
  }

  validateConfiguration(config) {
    const required = [
      'database.host',
      'database.password',
      'api_keys.payment_gateway',
      'encryption_keys.data_encryption'
    ];
    
    for (const path of required) {
      if (!this.getNestedValue(config, path)) {
        throw new Error(`Missing required configuration: ${path}`);
      }
    }
  }
}
```

## Infrastructure as Code (IaC)

### 1. Terraform Infrastructure Management

#### Production Infrastructure Template
```hcl
# Production Infrastructure Configuration
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "terraform-state-prod"
    key    = "infrastructure/terraform.tfstate"
    region = "us-west-2"
  }
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = "production-cluster"
  role_arn = aws_iam_role.cluster_role.arn
  version  = "1.27"

  vpc_config {
    subnet_ids              = aws_subnet.private[*].id
    endpoint_private_access = true
    endpoint_public_access  = true
    security_group_ids      = [aws_security_group.cluster.id]
  }

  depends_on = [
    aws_iam_role_policy_attachment.cluster_AmazonEKSClusterPolicy,
  ]
}

# RDS Database
resource "aws_rds_cluster" "main" {
  cluster_identifier      = "production-db"
  engine                 = "aurora-postgresql"
  engine_version         = "13.7"
  database_name          = "appdb"
  master_username        = "dbadmin"
  manage_master_user_password = true
  
  backup_retention_period = 7
  preferred_backup_window = "03:00-04:00"
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  tags = {
    Environment = "production"
    Backup      = "required"
  }
}
```

#### Infrastructure Validation Pipeline
```yaml
# .github/workflows/infrastructure.yml
name: Infrastructure Deployment

on:
  push:
    branches: [main]
    paths: ['infrastructure/**']

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.5.0
          
      - name: Terraform Format Check
        run: terraform fmt -check -recursive
        
      - name: Terraform Init
        run: terraform init
        
      - name: Terraform Validate
        run: terraform validate
        
      - name: Terraform Plan
        run: terraform plan -out=tfplan
        
      - name: Security Scan
        uses: aquasecurity/tfsec-action@v1.0.0
        
  deploy:
    needs: validate
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Terraform Apply
        run: terraform apply -auto-approve tfplan
        
      - name: Post-deployment Tests
        run: ./scripts/test-infrastructure.sh
```

## Monitoring and Observability Integration

### 1. Deployment Health Monitoring

#### Health Check Implementation
```javascript
// Comprehensive Health Check System
class HealthCheckService {
  constructor() {
    this.checks = [
      new DatabaseHealthCheck(),
      new RedisHealthCheck(),
      new ExternalAPIHealthCheck(),
      new DiskSpaceHealthCheck(),
      new MemoryHealthCheck()
    ];
  }

  async runHealthChecks() {
    const results = await Promise.allSettled(
      this.checks.map(check => this.runSingleCheck(check))
    );

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {},
      overall: {
        healthy: 0,
        unhealthy: 0,
        total: results.length
      }
    };

    results.forEach((result, index) => {
      const checkName = this.checks[index].name;
      
      if (result.status === 'fulfilled' && result.value.healthy) {
        healthStatus.checks[checkName] = result.value;
        healthStatus.overall.healthy++;
      } else {
        healthStatus.checks[checkName] = {
          healthy: false,
          error: result.reason?.message || 'Health check failed',
          timestamp: new Date().toISOString()
        };
        healthStatus.overall.unhealthy++;
        healthStatus.status = 'unhealthy';
      }
    });

    return healthStatus;
  }

  async runSingleCheck(check) {
    const startTime = Date.now();
    const result = await check.execute();
    const duration = Date.now() - startTime;

    return {
      healthy: result.success,
      responseTime: duration,
      details: result.details,
      timestamp: new Date().toISOString()
    };
  }
}
```

#### Deployment Metrics Collection
```python
# Deployment Success Tracking
class DeploymentMetrics:
    def __init__(self, metrics_client):
        self.metrics = metrics_client
        
    def record_deployment_start(self, version, environment):
        self.metrics.increment('deployment.started', tags={
            'version': version,
            'environment': environment
        })
        
    def record_deployment_success(self, version, environment, duration):
        self.metrics.increment('deployment.success', tags={
            'version': version,
            'environment': environment
        })
        self.metrics.histogram('deployment.duration', duration, tags={
            'version': version,
            'environment': environment
        })
        
    def record_deployment_failure(self, version, environment, error_type):
        self.metrics.increment('deployment.failure', tags={
            'version': version,
            'environment': environment,
            'error_type': error_type
        })
        
    def record_rollback(self, version, environment, reason):
        self.metrics.increment('deployment.rollback', tags={
            'version': version,
            'environment': environment,
            'reason': reason
        })
```

## Rollback Procedures

### 1. Automated Rollback Triggers

#### Failure Detection and Automatic Rollback
```bash
#!/bin/bash
# Automated Rollback Script

DEPLOYMENT_VERSION=$1
ROLLBACK_VERSION=$2
ENVIRONMENT=$3

# Health check function
check_deployment_health() {
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "Health check attempt $attempt/$max_attempts"
        
        # Check application health endpoint
        if curl -f -s "http://app-service/health" > /dev/null; then
            # Check error rate from metrics
            error_rate=$(curl -s "http://metrics-service/api/v1/query?query=rate(http_requests_total{status=~'5..'}[5m])" | jq -r '.data.result[0].value[1]')
            
            if (( $(echo "$error_rate < 0.01" | bc -l) )); then
                echo "Deployment health check passed"
                return 0
            fi
        fi
        
        sleep 30
        ((attempt++))
    done
    
    echo "Deployment health check failed"
    return 1
}

# Deploy new version
echo "Deploying version $DEPLOYMENT_VERSION to $ENVIRONMENT"
kubectl set image deployment/app app=myapp:$DEPLOYMENT_VERSION

# Wait for deployment
kubectl rollout status deployment/app --timeout=600s

# Health check with automatic rollback
if ! check_deployment_health; then
    echo "Deployment failed health checks. Initiating rollback..."
    
    # Rollback to previous version
    kubectl set image deployment/app app=myapp:$ROLLBACK_VERSION
    kubectl rollout status deployment/app --timeout=300s
    
    # Verify rollback success
    if check_deployment_health; then
        echo "Rollback completed successfully"
        exit 0
    else
        echo "Rollback failed! Manual intervention required"
        exit 2
    fi
else
    echo "Deployment completed successfully"
fi
```

### 2. Manual Rollback Procedures

#### Emergency Rollback Checklist
```markdown
# Emergency Rollback Procedure

## Immediate Actions (0-2 minutes)
- [ ] Stop current deployment process
- [ ] Identify last known good version
- [ ] Execute rollback command
- [ ] Verify traffic routing to old version

## Verification Steps (2-5 minutes)
- [ ] Check application health endpoints
- [ ] Verify database connectivity
- [ ] Test critical user journeys
- [ ] Monitor error rates and response times

## Communication (0-10 minutes)
- [ ] Notify incident response team
- [ ] Update status page if customer-facing
- [ ] Communicate rollback completion to stakeholders
- [ ] Document incident details for post-mortem

## Post-Rollback Analysis
- [ ] Analyze failure root cause
- [ ] Review deployment process gaps
- [ ] Plan remediation for failed deployment
- [ ] Update deployment procedures if needed
```

## Deployment Quality Gates

### Pre-Deployment Validation
- [ ] **Build Success**: All components build without errors
- [ ] **Test Coverage**: Unit and integration tests pass with required coverage
- [ ] **Security Scan**: No high/critical security vulnerabilities
- [ ] **Performance Baseline**: No significant performance regression
- [ ] **Database Migration**: Migrations are backward compatible and tested
- [ ] **Configuration Validation**: All required configuration values present

### Post-Deployment Monitoring
- [ ] **Health Checks**: All application health endpoints responding
- [ ] **Error Monitoring**: Error rates within acceptable thresholds
- [ ] **Performance Monitoring**: Response times and throughput within SLA
- [ ] **Business Metrics**: Key business indicators functioning normally
- [ ] **User Experience**: Critical user journeys working correctly

## Mode-Specific Focus

This mode supplements CLAUDE.md with deployment-specific automation frameworks, release management strategies, infrastructure as code patterns, and comprehensive rollback procedures for reliable, zero-downtime production deployments.