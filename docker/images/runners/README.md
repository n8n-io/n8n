# n8n - Task runners (`n8nio/runners`) - (PREVIEW)

`n8nio/runners` image includes [JavaScript runner](https://github.com/n8n-io/n8n/tree/master/packages/%40n8n/task-runner),
[Python runner](https://github.com/n8n-io/n8n/tree/master/packages/%40n8n/task-runner-python) and
[Task runner launcher](https://github.com/n8n-io/task-runner-launcher) that connects to a Task Broker
running on the main n8n instance when running in `external` mode.  This image is to be launched as a sidecar
container to the main n8n container.

[Task runners](https://docs.n8n.io/hosting/configuration/task-runners/) are used to execute user-provided code
in the [Code Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/), isolated from the n8n instance.

For official documentation, please see [here](https://docs.n8n.io/hosting/configuration/task-runners/).

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
N8N_RUNNERS_ENABLED=true \
N8N_RUNNERS_MODE=external \
N8N_RUNNERS_AUTH_TOKEN=test \
N8N_NATIVE_PYTHON_RUNNER=true \
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

