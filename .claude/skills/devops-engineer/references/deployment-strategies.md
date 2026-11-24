# Deployment Strategies

## Strategy Comparison

| Strategy | Use When | Rollback | Risk |
|----------|----------|----------|------|
| **Rolling** | Standard updates, can tolerate mixed versions | Automatic via health checks | Low |
| **Blue-Green** | Zero downtime, instant rollback needed | Switch traffic to old env | Medium |
| **Canary** | Risk mitigation, gradual rollout | Scale down canary | Low |
| **Recreate** | Stateful apps, breaking changes | Redeploy previous version | High |

## Rolling Deployment (Kubernetes)

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%        # Max pods above desired
      maxUnavailable: 25%  # Max pods unavailable
```

## Blue-Green with Ingress

```yaml
# Blue deployment (current)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-blue
  labels:
    version: blue
---
# Green deployment (new)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-green
  labels:
    version: green
---
# Service pointing to active version
apiVersion: v1
kind: Service
metadata:
  name: app
spec:
  selector:
    version: blue  # Switch to 'green' for cutover
```

## Canary with Istio

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app
spec:
  hosts:
    - app
  http:
    - match:
        - headers:
            canary:
              exact: "true"
      route:
        - destination:
            host: app-canary
    - route:
        - destination:
            host: app-stable
          weight: 90
        - destination:
            host: app-canary
          weight: 10
```

## Rollback Procedures

### Kubernetes Rollback
```bash
# View rollout history
kubectl rollout history deployment/app

# Rollback to previous
kubectl rollout undo deployment/app

# Rollback to specific revision
kubectl rollout undo deployment/app --to-revision=2

# Check status
kubectl rollout status deployment/app
```

### ArgoCD Rollback
```bash
argocd app rollback app-prod --revision=123
```

### Terraform Rollback
```bash
# Identify previous state
terraform state list

# Import previous configuration
git checkout HEAD~1 -- main.tf
terraform apply
```

## Pre-deployment Checklist

- [ ] Database migrations are backward compatible
- [ ] Feature flags for new functionality
- [ ] Monitoring dashboards updated
- [ ] Alert thresholds reviewed
- [ ] Rollback procedure documented
- [ ] Staging tested and approved
- [ ] Team notified of deployment window

## Post-deployment Verification

```bash
# Check pod status
kubectl get pods -l app=app

# Check logs for errors
kubectl logs -l app=app --tail=100 | grep -i error

# Verify endpoints
curl -f https://app.example.com/health

# Check metrics
# - Error rate < 1%
# - Latency p99 < 500ms
# - No memory/CPU spikes
```

## Deployment Metrics (DORA)

Track four key metrics:
- **Deployment Frequency**: Target 10+/day
- **Lead Time for Changes**: Target <1 hour
- **Change Failure Rate**: Target <5%
- **MTTR**: Target <30 minutes

```yaml
# Prometheus metrics for DORA tracking
- record: deployment:frequency:1d
  expr: count_over_time(deployment_completed[1d])

- record: deployment:lead_time:p95
  expr: histogram_quantile(0.95,
    rate(commit_to_deploy_seconds_bucket[1h]))

- record: deployment:failure_rate
  expr: |
    sum(rate(deployment_failed[1h]))
    / sum(rate(deployment_total[1h]))
```

## Advanced Canary with Automated Analysis

```yaml
# Flagger: Automated canary with rollback
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api
spec:
  provider: istio
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  progressDeadlineSeconds: 60
  service:
    port: 8080
    trafficPolicy:
      tls:
        mode: ISTIO_MUTUAL
  analysis:
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: error-rate
        templateRef:
          name: error-rate
        thresholdRange:
          max: 1
      - name: latency
        templateRef:
          name: latency
        thresholdRange:
          max: 500
    webhooks:
      - name: acceptance-test
        type: pre-rollout
        url: http://test-runner/
      - name: load-test
        url: http://loadtester/
        timeout: 5s
        metadata:
          type: bash
          cmd: "hey -z 1m -q 10 http://api-canary:8080/"
```

## Shadow Deployment

```yaml
# Mirror traffic to shadow deployment
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api
spec:
  hosts:
    - api
  http:
    - match:
        - headers:
            x-test-version:
              exact: "v2"
      route:
        - destination:
            host: api
            subset: v2
      mirror:
        host: api
        subset: v2-shadow
      mirrorPercentage:
        value: 100
    - route:
        - destination:
            host: api
            subset: v1
```
