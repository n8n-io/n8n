# n8n - Task runners (`n8nio/runners`) - (PREVIEW)

`n8nio/runners` image includes [JavaScript runner](https://github.com/n8n-io/n8n/tree/master/packages/%40n8n/task-runner),
[Python runner](https://github.com/n8n-io/n8n/tree/master/packages/%40n8n/task-runner-python) and
[Task runner launcher](https://github.com/n8n-io/task-runner-launcher) that connects to a Task Broker
running on the main n8n instance when running in `external` mode.  This image is to be launched as a sidecar
container to the main n8n container.

[Task runners](https://docs.n8n.io/hosting/configuration/task-runners/) are used to execute user-provided code
in the [Code Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/), isolated from the n8n instance.


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

## Adding extra dependencies (custom image)

To make additional packages available on the Code node you can bake extra packages into your custom runners image at build time.

* **JavaScript** — edit `docker/images/runners/package.json`
  (package.json manifest used to install runtime-only deps into the JS runner)
* **Python (Native)** — edit `docker/images/runners/extras.txt`
  (requirements.txt-style list installed into the Python runner venv)

> Important: for security, any external libraries must be explicitly allowed for Code node use. Update `n8n-task-runners.json` to allowlist what you add.

### 1) JavaScript packages

Edit the runtime extras manifest `docker/images/runners/package.json`:

```json
{
  "name": "task-runner-runtime-extras",
  "description": "Runtime-only deps for the JS task-runner image, installed at image build.",
  "private": true,
  "dependencies": {
    "moment": "2.30.1"
  }
}
```

Add any packages you want under `"dependencies"` (pin them for reproducibility), e.g.:

```json
"dependencies": {
  "moment": "2.30.1",
  "uuid": "9.0.0"
}
```

### 2) Python packages

Edit the requirements file `docker/images/runners/extras.txt`:

```
# Runtime-only extras for the Python task runner (installed at image build)
numpy==2.3.2
# add more, one per line, e.g.:
# pandas==2.2.2
```

> Tip: pin versions (e.g., `==2.3.2`) for deterministic builds.

### 3) Allowlist packages for the Code node

Open `docker/images/runners/n8n-task-runners.json` and add your packages to the env overrides:

```json
{
  "task-runners": [
    {
      "runner-type": "javascript",
      "env-overrides": {
        "NODE_FUNCTION_ALLOW_BUILTIN": "crypto",
        "NODE_FUNCTION_ALLOW_EXTERNAL": "moment,uuid",   // <-- add JS packages here
      }
    },
    {
      "runner-type": "python",
      "env-overrides": {
        "PYTHONPATH": "/opt/runners/task-runner-python",
        "N8N_RUNNERS_STDLIB_ALLOW": "json",
        "N8N_RUNNERS_EXTERNAL_ALLOW": "numpy,pandas"     // <-- add Python packages here
      }
    }
  ]
}
```

* `NODE_FUNCTION_ALLOW_BUILTIN` — comma-separated list of allowed node builtin modules.
* `NODE_FUNCTION_ALLOW_EXTERNAL` — comma-separated list of allowed JS packages.
* `N8N_RUNNERS_STDLIB_ALLOW` — comma-separated list of allowed Python standard library packages.
* `N8N_RUNNERS_EXTERNAL_ALLOW` — comma-separated list of allowed Python packages.

### 4) Build your custom image

From the repo root:

```bash
docker buildx build \
  -f docker/images/runners/Dockerfile \
  -t n8nio/runners:custom \
  .
```

### 5) Run it

Same as before, but use your custom image's tag:

```bash
docker run --rm -it \
  -e N8N_RUNNERS_AUTH_TOKEN=test \
  -e N8N_RUNNERS_LAUNCHER_LOG_LEVEL=debug \
  -e N8N_RUNNERS_TASK_BROKER_URI=http://host.docker.internal:5679 \
  -p 5680:5680 \
  n8nio/runners:custom
```
