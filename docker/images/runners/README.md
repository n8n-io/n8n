# n8n - Task runners (`n8nio/runners`) - (PREVIEW)

`n8nio/runners` image includes [JavaScript runner](https://github.com/n8n-io/n8n/tree/master/packages/%40n8n/task-runner),
[Python runner](https://github.com/n8n-io/n8n/tree/master/packages/%40n8n/task-runner-python) and
[Task runner launcher](https://github.com/n8n-io/task-runner-launcher) that connects to a Task Broker
running on the main n8n instance when running in `external` mode.  This image is to be launched as a sidecar
container to the main n8n container.

[Task runners](https://docs.n8n.io/hosting/configuration/task-runners/) are used to execute user-provided code
in the [Code Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/), isolated from the n8n instance.


## Testing locally

Start n8n on your host machine with Task Broker enabled

```
N8N_RUNNERS_ENABLED=true \
N8N_RUNNERS_MODE=external \
N8N_RUNNERS_AUTH_TOKEN=test \
N8N_LOG_LEVEL=debug \
pnpm start
```

and then start the task runner container with

```
docker run --rm -it \
-e N8N_RUNNERS_AUTH_TOKEN=test \
-e N8N_RUNNERS_LAUNCHER_LOG_LEVEL=debug \
-e N8N_RUNNERS_TASK_BROKER_URI=http://host.docker.internal:5679 \
-p 5680:5680 \
n8nio/runners
```

To build the image, run

```
docker buildx build --no-cache \
  -f docker/images/runners/Dockerfile \
  --build-arg NODE_VERSION=22 \
	--build-arg PYTHON_IMAGE=python:3.13-slim \
  --progress=plain \
  -t n8nio/runners \
  .
```
