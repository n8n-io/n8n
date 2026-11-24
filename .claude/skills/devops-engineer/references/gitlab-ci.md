# GitLab CI/CD Pipelines

## Complete CI/CD Pipeline

```yaml
# .gitlab-ci.yml — keep the root file short and declarative
workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_COMMIT_TAG
    - if: $CI_PIPELINE_SOURCE == "schedule"

stages: [validate, test, build, deploy]

default:
  interruptible: true
  retry:
    max: 2
    when: [runner_system_failure, stuck_or_timeout_failure]

include:
  - local: .gitlab/ci/lint.yml
  - local: .gitlab/ci/test.yml
  - local: .gitlab/ci/build.yml
  - local: .gitlab/ci/deploy.yml
```

```yaml
# .gitlab/ci/test.yml
unit-test:
  stage: test
  needs: []                     # fails fast, doesn't wait on validate
  image: node:20
  cache:
    key:
      files: [package-lock.json]
    paths: [.npm/]
  script:
    - npm ci --cache .npm
    - npm test -- --coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d.]+)/'
  artifacts:
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

```yaml
# .gitlab/ci/build.yml
build-image:
  stage: build
  needs: [unit-test]
  image:
    name: moby/buildkit:rootless
    entrypoint: [""]
  variables:
    BUILDKITD_FLAGS: --oci-worker-no-process-sandbox
  before_script:
    - mkdir -p ~/.docker
    - AUTH=$(echo -n "$CI_REGISTRY_USER:$CI_REGISTRY_PASSWORD" | base64 | tr -d '\n')
    - printf '{"auths":{"%s":{"auth":"%s"}}}' "$CI_REGISTRY" "$AUTH" > ~/.docker/config.json
  script:
    - >
      buildctl-daemonless.sh build
      --frontend dockerfile.v0
      --local context="${CI_PROJECT_DIR}"
      --local dockerfile="${CI_PROJECT_DIR}"
      --output type=image,name="${CI_REGISTRY_IMAGE}:${CI_COMMIT_SHORT_SHA}",push=true
      --export-cache type=registry,ref="${CI_REGISTRY_IMAGE}:buildcache"
      --import-cache type=registry,ref="${CI_REGISTRY_IMAGE}:buildcache"
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

```yaml
# .gitlab/ci/deploy.yml
deploy-production:
  stage: deploy
  needs: [build-image]
  environment:
    name: production
    url: https://app.example.com
    deployment_tier: production
  resource_group: production        # serializes concurrent deploys
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
  script:
    - kubectl set image deployment/app app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
```

## Core Principles (from GitLab CI/CD best-practices survey)

1. **`workflow:rules` is the master switch** — decide once, at the top, whether a pipeline should exist at all (push vs MR vs schedule vs API/trigger). Prevents duplicate pipelines from the same commit (e.g. branch pipeline + MR pipeline both firing) via `$CI_OPEN_MERGE_REQUESTS` / `$CI_MERGE_REQUEST_DRAFT` checks.
2. **`needs` over `stages` for DAG** — declare exact job dependencies with `needs:` instead of relying on stage ordering. Use `needs: []` for fast checks that should start immediately and fail early. Optimize the critical path, not every job.
3. **Cache vs artifacts are different things** — cache = reusable dependencies (key it off the lockfile, add `fallback_keys` so new branches don't start cold); artifacts = build outputs consumed by later jobs or humans (set `expire_in`, use `expose_as` for reviewer-facing files). Keep separate cache keys for protected vs unprotected refs.
4. **Reuse via `extends` + hidden jobs first, CI/CD components second** — components take typed `inputs` and should be pinned to a tag/SHA (never a moving `~latest`), documented, and treated as a supply-chain dependency if sourced externally.
5. **Environments are first-class objects** — declare `environment:name/url/deployment_tier`, use `on_stop`/`auto_stop_in` for ephemeral review apps, `resource_group` to serialize deploys to the same target, and protected environments + `manual_confirmation` for production.
6. **Secrets never live in CI/CD variables for anything sensitive** — prefer OIDC to cloud providers over static keys; use HashiCorp Vault integration with scoped roles, bound claims, and short TTLs. Be careful with `CI_JOB_TOKEN` scope (limit the allow-list) and treat MRs from forks as untrusted.
7. **Runner blast radius** — register runners at the narrowest scope that works (project < group < instance). Docker executor without `privileged` mode is the default; privileged/DinD only on isolated, ephemeral runners. Split protected and unprotected jobs onto separate runner pools/tags.
8. **Build images without long-lived root daemons** — prefer BuildKit rootless over classic privileged DinD (kaniko is archived and unmaintained; plan a migration if pipelines still use it); pass secrets via mount-type (`--mount=type=secret`), not `ARG`/`ENV`; tag by commit SHA, never `latest`; generate SBOM and sign images (cosign/notation) after build.
9. **MR pipelines are where checks matter** — prefer merged-results pipelines (test the merge of source+target, not just source) and merge trains for high-throughput repos, over relying on branch pipelines.
10. **Report everything GitLab can render** — `artifacts:reports:junit` for test results, `coverage_report` (Cobertura) for MR diff coverage annotations vs the `coverage:` regex for the summary badge, Code Quality reports, and screenshots/videos/logs as artifacts for UI/E2E failures. The MR widget is the primary feedback surface — optimize for it.

## Common Patterns

### Merge request pipelines only (no duplicate branch pipelines)
```yaml
workflow:
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
```

### Matrix builds
```yaml
test:
  stage: test
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
        OS: [ubuntu, alpine]
  image: node:${NODE_VERSION}-${OS}
```

### Reusable CI/CD component (pinned, not ~latest)
```yaml
include:
  - component: gitlab.com/my-org/ci-components/deploy@1.4.2
    inputs:
      environment: production
      k8s-namespace: app-prod
```

### Parent/child (monorepo) pipeline
```yaml
trigger-backend:
  trigger:
    include: backend/.gitlab-ci.yml
    strategy: mirror        # parent status mirrors child's real status
  rules:
    - changes: [backend/**/*]
```

### OIDC to a cloud provider (no static keys)
```yaml
deploy:
  id_tokens:
    AWS_ID_TOKEN:
      aud: https://gitlab.example.com
  script:
    - aws sts assume-role-with-web-identity --role-arn $ROLE_ARN --web-identity-token $AWS_ID_TOKEN ...
```

### Dependency Proxy for base images (avoid Docker Hub rate limits)
```yaml
build:
  image: ${CI_DEPENDENCY_PROXY_GROUP_IMAGE_PREFIX}/node:20-alpine
```

## Quick Reference

| Feature | Purpose |
|---|---|
| `workflow:rules` | Decide whether a pipeline is created at all; dedupe push/MR pipelines |
| `needs:` | DAG dependencies between jobs, decoupled from stage order |
| `needs: []` | Job starts immediately, no upstream wait |
| `resource_group` | Serialize deploys to the same environment |
| `environment:deployment_tier` | Classifies env as production/staging/testing/development/other |
| `parallel:matrix` | Fan out a job across variable combinations |
| `extends` | Share config between jobs without `include` overhead |
| CI/CD components (`include:component`) | Typed, versioned, reusable pipeline building blocks |
| `trigger:include` + `strategy: mirror` | Parent/child pipelines for monorepos with real status propagation |
| `id_tokens` (OIDC) | Short-lived cloud credentials instead of static secrets |
| `artifacts:reports:junit` | Test results surfaced in MR widget |
| `artifacts:reports:coverage_report` | Per-line diff coverage annotations in MR |
| `CI_JOB_TOKEN` scope allow-list | Limits which projects a job token can access |

## Anti-Patterns to Avoid

- Hardcoding branch names/environments deep inside job scripts instead of centralizing in `workflow:rules`
- Letting `default:` become a dumping ground that obscures per-job behavior
- Relying on `stages:` ordering alone instead of `needs:` for large pipelines (slow, unclear critical path)
- One shared cache key for protected and unprotected refs (cache poisoning risk)
- Privileged Docker-in-Docker as the default build method
- Long-lived static cloud credentials in CI/CD variables when OIDC is available
- Including third-party CI/CD components at a floating ref instead of a pinned tag/SHA
- Testing only the source branch in MRs instead of merged results
