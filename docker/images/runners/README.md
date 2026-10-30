# n8n - Task runners (`n8nio/runners`) - (PREVIEW)

`n8nio/runners` image includes [JavaScript runner](https://github.com/n8n-io/n8n/tree/master/packages/%40n8n/task-runner),
[Python runner](https://github.com/n8n-io/n8n/tree/master/packages/%40n8n/task-runner-python) and
[Task runner launcher](https://github.com/n8n-io/task-runner-launcher) that connects to a Task Broker
running on the main n8n instance when running in `external` mode.  This image is to be launched as a sidecar
container to the main n8n container.

[Task runners](https://docs.n8n.io/hosting/configuration/task-runners/) are used to execute user-provided code
in the [Code Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/), isolated from the n8n instance.

For official documentation, please see [here](https://docs.n8n.io/hosting/configuration/task-runners/).

For a distroless variant of this image, see [here](./Dockerfile.distroless).

Tags with a `-debian` suffix (for example `n8nio/runners:2.41.0-debian`) use Debian (glibc) instead of Alpine (musl). Use them when a Code node loads a vendor library that needs glibc, for example `oracledb` in Thick mode or `ibm_db`. Add the library and the driver in a derived image, the same way as for the n8n image (see its README). This example adds Oracle Instant Client and the `oracledb` driver:

```dockerfile
FROM debian:trixie-slim AS oracle
ARG TARGETARCH
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl unzip && \
    case "$TARGETARCH" in \
      amd64) zip=instantclient-basiclite-linuxx64.zip ;; \
      arm64) zip=instantclient-basiclite-linux-arm64.zip ;; \
    esac && \
    curl -fsSL -o /tmp/ic.zip "https://download.oracle.com/otn_software/linux/instantclient/$zip" && \
    unzip -q /tmp/ic.zip -d /opt/oracle && mv /opt/oracle/instantclient_* /opt/oracle/instantclient

FROM n8nio/runners:2.41.0-debian
COPY --from=oracle /opt/oracle/instantclient /opt/oracle/instantclient
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient
USER root
RUN cd /opt/runners/task-runner-javascript && \
    pnpm add --allow-build=oracledb oracledb@6.10.0 --save-prod --no-lockfile
USER runner
```

Use the same n8n version for the runner and the n8n image. Use `-debian` on every container that must load the library: the n8n image for the Oracle node, the runner for a Code node, both if you use both.

For development purposes only, see below.

## Testing locally

### 1) Make a production build of n8n

```
pnpm run build:n8n
```

### 2) Build the task runners image

```
docker buildx build \
  -f docker/images/runners/Dockerfile \
  -t n8nio/runners \
  .
```

### 3) Start n8n on your host machine with Task Broker enabled

```
N8N_RUNNERS_MODE=external \
N8N_RUNNERS_AUTH_TOKEN=test \
N8N_LOG_LEVEL=debug \
pnpm start
```

### 4) Start the task runner container

```
docker run --rm -it \
-e N8N_RUNNERS_AUTH_TOKEN=test \
-e N8N_RUNNERS_LAUNCHER_LOG_LEVEL=debug \
-e N8N_RUNNERS_TASK_BROKER_URI=http://host.docker.internal:5679 \
-p 5680:5680 \
n8nio/runners
```

If you need to add extra dependencies (custom image), follow [these instructions](https://docs.n8n.io/hosting/configuration/task-runners/#adding-extra-dependencies).

