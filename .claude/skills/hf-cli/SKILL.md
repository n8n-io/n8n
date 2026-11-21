---
name: hf-cli
description: "Hugging Face Hub CLI (`hf`) for downloading, uploading, and managing models, datasets, spaces, buckets, repos, papers, jobs, and more on the Hugging Face Hub. Use when: handling authentication; managing local cache; managing Hugging Face Buckets; running or scheduling jobs on Hugging Face infrastructure; managing Hugging Face repos; discussions and pull requests; browsing models, datasets and spaces; reading, searching, or browsing academic papers; managing collections; querying datasets; configuring spaces; setting up webhooks; or deploying and managing HF Inference Endpoints. Make sure to use this skill whenever the user mentions 'hf', 'huggingface', 'Hugging Face', 'huggingface-cli', or 'hugging face cli', or wants to do anything related to the Hugging Face ecosystem and to AI and ML in general. Also use for cloud storage needs like training checkpoints, data pipelines, or agent traces. Use even if the user doesn't explicitly ask for a CLI command. Replaces the deprecated `huggingface-cli`."
---

Install: `curl -LsSf https://hf.co/cli/install.sh | bash -s`.

The Hugging Face Hub CLI tool `hf` is available. IMPORTANT: The `hf` command replaces the deprecated `huggingface-cli` command.

Use `hf --help` to view available functions. Note that auth commands are now all under `hf auth` e.g. `hf auth whoami`.

Generated with `huggingface_hub v2.3.0`. Run `hf skills add --force` to regenerate.

## Commands

- `hf cp SRC` — Copy files between local paths, repositories, and buckets. `[--format [auto|human|agent|json|quiet]]`
- `hf download REPO_ID` — Download files from the Hub. `[--type [model|dataset|space|kernel] --revision TEXT --include TEXT --exclude TEXT --cache-dir TEXT --local-dir TEXT --force-download --dry-run --max-workers INTEGER --format [auto|human|agent|json|quiet]]`
- `hf env` — Print information about the environment. `[--format [auto|human|agent|json|quiet]]`
- `hf sync` — Sync files between local directory and a bucket. `[--delete --ignore-times --ignore-sizes --plan TEXT --apply TEXT --dry-run --include TEXT --exclude TEXT --filter-from TEXT --existing --ignore-existing --verbose --format [auto|human|agent|json|quiet]]`
- `hf update` — Update the `hf` CLI to the latest version. `[--format [auto|human|agent|json|quiet]]`
- `hf upload REPO_ID` — Upload a file or a folder to the Hub. `[--type [model|dataset|space|kernel] --revision TEXT --private --include TEXT --exclude TEXT --delete TEXT --commit-message TEXT --commit-description TEXT --create-pr --every FLOAT --format [auto|human|agent|json|quiet]]`
- `hf version` — Print information about the hf version. `[--format [auto|human|agent|json|quiet]]`

### `hf auth` — Manage authentication (login, logout, etc.).

- `hf auth list` — List all stored access tokens. `[--format [auto|human|agent|json|quiet]]`
- `hf auth login` — Login from your browser, or using a token from huggingface.co/settings/tokens. `[--add-to-git-credential --force --format [auto|human|agent|json|quiet]]`
- `hf auth logout` — Logout from a specific token. `[--token-name TEXT --format [auto|human|agent|json|quiet]]`
- `hf auth switch` — Switch between access tokens. `[--token-name TEXT --add-to-git-credential --format [auto|human|agent|json|quiet]]`
- `hf auth token` — Print the current access token to stdout. `[--format [auto|human|agent|json|quiet]]`
- `hf auth whoami` — Find out which huggingface.co account you are logged in as. `[--format [auto|human|agent|json|quiet]]`

### `hf buckets` — Commands to interact with buckets.

- `hf buckets cp SRC` — Copy files between local paths, repositories, and buckets. `[--format [auto|human|agent|json|quiet]]`
- `hf buckets create BUCKET_ID` — Create a new bucket. `[--private --region [us|eu] --exist-ok --format [auto|human|agent|json|quiet]]`
- `hf buckets delete BUCKET_ID` — Delete a bucket. `[--yes --missing-ok --format [auto|human|agent|json|quiet]]`
- `hf buckets info BUCKET_ID` — Get info about a bucket. `[--format [auto|human|agent|json|quiet]]`
- `hf buckets list` — List buckets or files in a bucket. `[--human-readable --tree --recursive --search TEXT --format [auto|human|agent|json|quiet]]`
- `hf buckets move FROM_ID TO_ID` — Move (rename) a bucket to a new name or namespace. `[--format [auto|human|agent|json|quiet]]`
- `hf buckets remove ARGUMENT` — Remove files from a bucket. `[--recursive --yes --dry-run --include TEXT --exclude TEXT --format [auto|human|agent|json|quiet]]`
- `hf buckets settings BUCKET_ID` — Update bucket settings (visibility). `[--private --public --format [auto|human|agent|json|quiet]]`
- `hf buckets sync` — Sync files between local directory and a bucket. `[--delete --ignore-times --ignore-sizes --plan TEXT --apply TEXT --dry-run --include TEXT --exclude TEXT --filter-from TEXT --existing --ignore-existing --verbose --format [auto|human|agent|json|quiet]]`

### `hf cache` — Manage local cache directory.

- `hf cache list` — List cached repositories or revisions. `[--cache-dir TEXT --revisions --filter TEXT --sort [accessed|accessed:asc|accessed:desc|modified|modified:asc|modified:desc|name|name:asc|name:desc|size|size:asc|size:desc] --limit INTEGER --show-warnings --format [auto|human|agent|json|quiet]]`
- `hf cache prune` — Remove detached revisions and incomplete downloads from the cache. `[--cache-dir TEXT --yes --dry-run --format [auto|human|agent|json|quiet]]`
- `hf cache rm TARGETS` — Remove cached repositories, revisions or files. `[--cache-dir TEXT --yes --dry-run --format [auto|human|agent|json|quiet]]`
- `hf cache verify REPO_ID` — Verify checksums for a single repo revision from cache or a local directory. `[--type [model|dataset|space|kernel] --revision TEXT --cache-dir TEXT --local-dir TEXT --fail-on-missing-files --fail-on-extra-files --format [auto|human|agent|json|quiet]]`

### `hf collections` — Interact with collections on the Hub.

- `hf collections add-item COLLECTION_SLUG ITEM_ID ITEM_TYPE` — Add an item to a collection. `[--note TEXT --exists-ok --format [auto|human|agent|json|quiet]]`
- `hf collections create TITLE` — Create a new collection on the Hub. `[--namespace TEXT --description TEXT --private --exists-ok --format [auto|human|agent|json|quiet]]`
- `hf collections delete COLLECTION_SLUG` — Delete a collection from the Hub. `[--missing-ok --format [auto|human|agent|json|quiet]]`
- `hf collections delete-item COLLECTION_SLUG ITEM_OBJECT_ID` — Delete an item from a collection. `[--missing-ok --format [auto|human|agent|json|quiet]]`
- `hf collections info COLLECTION_SLUG` — Get info about a collection on the Hub. `[--format [auto|human|agent|json|quiet]]`
- `hf collections list` — List collections on the Hub. `[--owner TEXT --item TEXT --sort [lastModified|trending|upvotes] --limit INTEGER --format [auto|human|agent|json|quiet]]`
- `hf collections update COLLECTION_SLUG` — Update a collection's metadata on the Hub. `[--title TEXT --description TEXT --position INTEGER --private --theme TEXT --format [auto|human|agent|json|quiet]]`
- `hf collections update-item COLLECTION_SLUG ITEM_OBJECT_ID` — Update an item in a collection. `[--note TEXT --position INTEGER --format [auto|human|agent|json|quiet]]`

### `hf datasets` — Interact with datasets on the Hub.

- `hf datasets card DATASET_ID` — Get the dataset card (README) for a dataset on the Hub. `[--metadata --text --format [auto|human|agent|json|quiet]]`
- `hf datasets info DATASET_ID` — Get info about a dataset on the Hub. `[--revision TEXT --expand TEXT --format [auto|human|agent|json|quiet]]`
- `hf datasets leaderboard DATASET_ID` — List model scores from a dataset leaderboard. This command helps find the best models for a task or compare models by benchmark scores. Use 'hf datasets ls --filter benchmark:official' to list available leaderboards. `[--limit INTEGER --format [auto|human|agent|json|quiet]]`
- `hf datasets list` — List datasets on the Hub, or files in a dataset repo. `[--search TEXT --author TEXT --filter TEXT --sort [created_at|downloads|last_modified|likes|trending_score] --limit INTEGER --expand TEXT --human-readable --tree --recursive --revision TEXT --format [auto|human|agent|json|quiet]]`
- `hf datasets parquet DATASET_ID` — List parquet file URLs available for a dataset. `[--subset TEXT --split TEXT --format [auto|human|agent|json|quiet]]`
- `hf datasets sql SQL` — Execute a raw SQL query with DuckDB against dataset parquet URLs. `[--format [auto|human|agent|json|quiet]]`

### `hf discussions` — Manage discussions and pull requests on the Hub.

- `hf discussions close REPO_ID NUM` — Close a discussion or pull request. `[--comment TEXT --yes --type [model|dataset|space|kernel] --format [auto|human|agent|json|quiet]]`
- `hf discussions comment REPO_ID NUM` — Comment on a discussion or pull request. `[--body TEXT --body-file PATH --attach TEXT --type [model|dataset|space|kernel] --format [auto|human|agent|json|quiet]]`
- `hf discussions create REPO_ID --title TEXT` — Create a new discussion or pull request on a repo. `[--body TEXT --body-file PATH --pull-request --attach TEXT --type [model|dataset|space|kernel] --format [auto|human|agent|json|quiet]]`
- `hf discussions diff REPO_ID NUM` — Show the diff of a pull request. `[--type [model|dataset|space|kernel] --format [auto|human|agent|json|quiet]]`
- `hf discussions edit REPO_ID NUM COMMENT_ID` — Edit an existing comment on a discussion or pull request. `[--body TEXT --body-file PATH --attach TEXT --type [model|dataset|space|kernel] --format [auto|human|agent|json|quiet]]`
- `hf discussions info REPO_ID NUM` — Get info about a discussion or pull request. `[--type [model|dataset|space|kernel] --format [auto|human|agent|json|quiet]]`
- `hf discussions list REPO_ID` — List discussions and pull requests on a repo. `[--status [open|closed|merged|draft|all] --kind [all|discussion|pull_request] --author TEXT --limit INTEGER --type [model|dataset|space|kernel] --format [auto|human|agent|json|quiet]]`
- `hf discussions merge REPO_ID NUM` — Merge a pull request. `[--comment TEXT --yes --type [model|dataset|space|kernel] --format [auto|human|agent|json|quiet]]`
- `hf discussions rename REPO_ID NUM NEW_TITLE` — Rename a discussion or pull request. `[--type [model|dataset|space|kernel] --format [auto|human|agent|json|quiet]]`
- `hf discussions reopen REPO_ID NUM` — Reopen a closed discussion or pull request. `[--comment TEXT --yes --type [model|dataset|space|kernel] --format [auto|human|agent|json|quiet]]`

### `hf endpoints` — Manage Hugging Face Inference Endpoints.

- `hf endpoints catalog deploy` — Deploy an Inference Endpoint from the Model Catalog. `[--repo TEXT --recipe TEXT --name TEXT --accelerator [cpu|gpu|neuron] --gguf-file TEXT --namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf endpoints catalog list` — List the models available in the Model Catalog. `[--accelerator [cpu|gpu|neuron] --engine [llamacpp|sglang|tei|vllm] --license TEXT --task TEXT --search TEXT --limit INTEGER --format [auto|human|agent|json|quiet]]`
- `hf endpoints delete NAME` — Delete an Inference Endpoint permanently. `[--namespace TEXT --yes --format [auto|human|agent|json|quiet]]`
- `hf endpoints deploy NAME --repo TEXT --framework TEXT --accelerator TEXT --instance-size TEXT --instance-type TEXT --region TEXT --vendor TEXT` — Deploy an Inference Endpoint from a Hub repository. `[--namespace TEXT --task TEXT --min-replica INTEGER --max-replica INTEGER --scale-to-zero-timeout INTEGER --scaling-metric [pendingRequests|hardwareUsage] --scaling-threshold FLOAT --revision TEXT --custom-image TEXT --engine [custom|hf-serve|llamacpp|sglang|tei|tgi|tgi-neuron|vllm|vllm-neuron] --health-route TEXT --port INTEGER --container-registry-username TEXT --container-registry-password TEXT --tensor-parallel-size INTEGER --data-parallel-size INTEGER --container-command TEXT --container-args TEXT --env TEXT --env-file TEXT --secrets TEXT --secrets-file TEXT --type [public|authenticated|private] --format [auto|human|agent|json|quiet]]`
- `hf endpoints describe NAME` — Get information about an existing endpoint. `[--namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf endpoints hardware` — List the hardware available to deploy an Inference Endpoint on. `[--namespace TEXT --vendor TEXT --region TEXT --accelerator TEXT --instance-type TEXT --all --format [auto|human|agent|json|quiet]]`
- `hf endpoints list` — Lists all Inference Endpoints for the given namespace. `[--namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf endpoints pause NAME` — Pause an Inference Endpoint. `[--namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf endpoints resume NAME` — Resume an Inference Endpoint. `[--namespace TEXT --fail-if-already-running --format [auto|human|agent|json|quiet]]`
- `hf endpoints scale-to-zero NAME` — Scale an Inference Endpoint to zero. `[--namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf endpoints update NAME` — Update an existing endpoint. `[--namespace TEXT --repo TEXT --accelerator TEXT --instance-size TEXT --instance-type TEXT --framework TEXT --revision TEXT --task TEXT --custom-image TEXT --engine [custom|hf-serve|llamacpp|sglang|tei|tgi|tgi-neuron|vllm|vllm-neuron] --health-route TEXT --port INTEGER --tensor-parallel-size INTEGER --data-parallel-size INTEGER --container-command TEXT --container-args TEXT --min-replica INTEGER --max-replica INTEGER --scale-to-zero-timeout INTEGER --scaling-metric [pendingRequests|hardwareUsage] --scaling-threshold FLOAT --format [auto|human|agent|json|quiet]]`

### `hf extensions` — Manage hf CLI extensions.

- `hf extensions exec NAME` — Execute an installed extension.
- `hf extensions install REPO_ID` — Install an extension from a public GitHub repository. `[--force --format [auto|human|agent|json|quiet]]`
- `hf extensions list` — List installed extension commands. `[--format [auto|human|agent|json|quiet]]`
- `hf extensions remove NAME` — Remove an installed extension. `[--format [auto|human|agent|json|quiet]]`
- `hf extensions search` — Search extensions available on GitHub (tagged with 'hf-extension' topic). `[--format [auto|human|agent|json|quiet]]`
- `hf extensions update` — Update installed extension(s) to their latest version. `[--format [auto|human|agent|json|quiet]]`

### `hf jobs` — Run and manage Jobs on the Hub.

- `hf jobs cancel JOB_ID` — Cancel a Job `[--namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf jobs expose JOB_ID` — Replace exposed ports on a running Job. `[--public INTEGER --clear --namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf jobs hardware` — List available hardware options for Jobs `[--format [auto|human|agent|json|quiet]]`
- `hf jobs inspect JOB_IDS` — Display detailed information on one or more Jobs `[--namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf jobs labels JOB_ID` — Update labels on a Job. Passing --label replaces all existing labels; passing --name alone keeps them. `[--name TEXT --label TEXT --clear --namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf jobs list` — List Jobs. `[--all --status [COMPLETED|CANCELED|ERROR|DELETED|SCHEDULING|RUNNING] --label TEXT --name TEXT --limit INTEGER --namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf jobs logs JOB_ID` — Fetch the logs of a Job. `[--follow --tail INTEGER --namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf jobs rerun JOB_ID` — Run a new Job with an existing Job's spec. `[--detach --namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf jobs run IMAGE COMMAND` — Run a Job. `[--env TEXT --secrets TEXT --name TEXT --label TEXT --volume TEXT --env-file TEXT --secrets-file TEXT --flavor [cpu-basic|cpu-upgrade|cpu-performance|cpu-xl|t4-small|t4-medium|l4x1|l4x4|l40sx1|l40sx4|l40sx8|a10g-small|a10g-large|a10g-largex2|a10g-largex4|a100-large|a100x4|a100x8|h200|h200x2|h200x4|h200x8|rtx-pro-6000|rtx-pro-6000x2|rtx-pro-6000x4|rtx-pro-6000x8] --timeout TEXT --attempts INTEGER RANGE --detach --dry-run --expose INTEGER --expose-public INTEGER --ssh --network-group TEXT --network-alias TEXT --resource-group-id TEXT --namespace TEXT --format [agent|auto|human|json|quiet] --json --quiet]`
- `hf jobs scheduled delete SCHEDULED_JOB_ID` — Delete a scheduled Job. `[--namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf jobs scheduled inspect SCHEDULED_JOB_IDS` — Display detailed information on one or more scheduled Jobs `[--namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf jobs scheduled labels SCHEDULED_JOB_ID` — Update labels on a scheduled Job. Passing --label replaces all existing labels; passing --name alone keeps them. `[--name TEXT --label TEXT --clear --namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf jobs scheduled list` — List scheduled Jobs. `[--all --status [active|suspended] --label TEXT --name TEXT --namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf jobs scheduled reschedule SCHEDULED_JOB_ID SCHEDULE` — Change when a scheduled Job runs. `[--namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf jobs scheduled resume SCHEDULED_JOB_ID` — Resume (unpause) a scheduled Job. `[--namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf jobs scheduled run SCHEDULE IMAGE COMMAND` — Schedule a Job. `[--suspend --concurrency --env TEXT --secrets TEXT --name TEXT --label TEXT --volume TEXT --env-file TEXT --secrets-file TEXT --flavor [cpu-basic|cpu-upgrade|cpu-performance|cpu-xl|t4-small|t4-medium|l4x1|l4x4|l40sx1|l40sx4|l40sx8|a10g-small|a10g-large|a10g-largex2|a10g-largex4|a100-large|a100x4|a100x8|h200|h200x2|h200x4|h200x8|rtx-pro-6000|rtx-pro-6000x2|rtx-pro-6000x4|rtx-pro-6000x8] --timeout TEXT --attempts INTEGER RANGE --dry-run --expose INTEGER --expose-public INTEGER --resource-group-id TEXT --namespace TEXT --format [agent|auto|human|json|quiet] --json --quiet]`
- `hf jobs scheduled suspend SCHEDULED_JOB_ID` — Suspend (pause) a scheduled Job. `[--namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf jobs scheduled trigger SCHEDULED_JOB_ID` — Trigger a scheduled Job to run immediately (does not change the schedule). `[--namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf jobs scheduled uv run SCHEDULE SCRIPT` — Run a UV script (local file or URL) on HF infrastructure `[--suspend --concurrency --image TEXT --flavor [cpu-basic|cpu-upgrade|cpu-performance|cpu-xl|t4-small|t4-medium|l4x1|l4x4|l40sx1|l40sx4|l40sx8|a10g-small|a10g-large|a10g-largex2|a10g-largex4|a100-large|a100x4|a100x8|h200|h200x2|h200x4|h200x8|rtx-pro-6000|rtx-pro-6000x2|rtx-pro-6000x4|rtx-pro-6000x8] --env TEXT --secrets TEXT --name TEXT --label TEXT --volume TEXT --env-file TEXT --secrets-file TEXT --timeout TEXT --attempts INTEGER RANGE --dry-run --expose INTEGER --expose-public INTEGER --resource-group-id TEXT --namespace TEXT --with TEXT --python TEXT --format [agent|auto|human|json|quiet] --json --quiet]`
- `hf jobs ssh JOB_ID` — SSH into a running Job. `[--identity-file PATH --dry-run --namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf jobs stats` — Fetch the resource usage statistics and metrics of Jobs. `[--follow --namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf jobs uv run SCRIPT` — Run a UV script (local file or URL) on HF infrastructure `[--image TEXT --flavor [cpu-basic|cpu-upgrade|cpu-performance|cpu-xl|t4-small|t4-medium|l4x1|l4x4|l40sx1|l40sx4|l40sx8|a10g-small|a10g-large|a10g-largex2|a10g-largex4|a100-large|a100x4|a100x8|h200|h200x2|h200x4|h200x8|rtx-pro-6000|rtx-pro-6000x2|rtx-pro-6000x4|rtx-pro-6000x8] --env TEXT --secrets TEXT --name TEXT --label TEXT --volume TEXT --env-file TEXT --secrets-file TEXT --timeout TEXT --attempts INTEGER RANGE --detach --dry-run --expose INTEGER --expose-public INTEGER --ssh --network-group TEXT --network-alias TEXT --resource-group-id TEXT --namespace TEXT --with TEXT --python TEXT --format [agent|auto|human|json|quiet] --json --quiet]`
- `hf jobs wait JOB_IDS` — Wait for one or more Jobs to reach a terminal state. `[--timeout TEXT --namespace TEXT --format [auto|human|agent|json|quiet]]`

### `hf models` — Interact with models on the Hub.

- `hf models card MODEL_ID` — Get the model card (README) for a model on the Hub. `[--metadata --text --format [auto|human|agent|json|quiet]]`
- `hf models info MODEL_ID` — Get info about a model on the Hub. `[--revision TEXT --expand TEXT --format [auto|human|agent|json|quiet]]`
- `hf models list` — List models on the Hub, or files in a model repo. `[--search TEXT --author TEXT --filter TEXT --pipeline-tag TEXT --gated --apps TEXT --num-parameters TEXT --inference-provider [baseten|cerebras|cohere|deepinfra|fal-ai|featherless-ai|fireworks-ai|groq|hf-inference|novita|nscale|openai|ovhcloud|publicai|replicate|scaleway|together|wavespeed|zai-org] --warm --sort [created_at|downloads|last_modified|likes|trending_score] --limit INTEGER --expand TEXT --human-readable --tree --recursive --revision TEXT --format [auto|human|agent|json|quiet]]`

### `hf papers` — Interact with papers on the Hub.

- `hf papers info PAPER_ID` — Get info about a paper on the Hub. `[--format [auto|human|agent|json|quiet]]`
- `hf papers list` — List daily papers on the Hub. `[--date TEXT --week TEXT --month TEXT --submitter TEXT --sort [publishedAt|trending] --limit INTEGER --format [auto|human|agent|json|quiet]]`
- `hf papers read PAPER_ID` — Read a paper as markdown. `[--format [auto|human|agent|json|quiet]]`
- `hf papers search QUERY` — Search papers on the Hub. `[--limit INTEGER --format [auto|human|agent|json|quiet]]`

### `hf repos` — Manage repos on the Hub.

- `hf repos branch create REPO_ID BRANCH` — Create a new branch for a repo on the Hub. `[--revision TEXT --type [model|dataset|space|kernel] --exist-ok --format [auto|human|agent|json|quiet]]`
- `hf repos branch delete REPO_ID BRANCH` — Delete a branch from a repo on the Hub. `[--type [model|dataset|space|kernel] --format [auto|human|agent|json|quiet]]`
- `hf repos cp SRC` — Copy files between local paths, repositories, and buckets. `[--format [auto|human|agent|json|quiet]]`
- `hf repos create REPO_ID` — Create a new repo on the Hub. `[--type [model|dataset|space|kernel] --sdk TEXT --template TEXT --private --public --protected --exist-ok --resource-group-id TEXT --region [us|eu] --flavor [cpu-basic|cpu-upgrade|zero-a10g|t4-small|t4-medium|l4x1|l4x4|l40sx1|l40sx4|l40sx8|a10g-small|a10g-large|a10g-largex2|a10g-largex4|a100-large|a100x4|a100x8|rtx-pro-6000|rtx-pro-6000x2|rtx-pro-6000x4|rtx-pro-6000x8] --sleep-time INTEGER --secrets TEXT --secrets-file TEXT --env TEXT --env-file TEXT --volume TEXT --format [auto|human|agent|json|quiet]]`
- `hf repos delete REPO_ID` — Delete a repo from the Hub. This is an irreversible operation. `[--type [model|dataset|space|kernel] --missing-ok --yes --format [auto|human|agent|json|quiet]]`
- `hf repos delete-files REPO_ID PATTERNS` — Delete files from a repo on the Hub. `[--type [model|dataset|space|kernel] --revision TEXT --commit-message TEXT --commit-description TEXT --create-pr --format [auto|human|agent|json|quiet]]`
- `hf repos duplicate FROM_ID` — Duplicate a repo on the Hub (model, dataset, or Space). `[--type [model|dataset|space|kernel] --private --public --protected --exist-ok --resource-group-id TEXT --flavor [cpu-basic|cpu-upgrade|zero-a10g|t4-small|t4-medium|l4x1|l4x4|l40sx1|l40sx4|l40sx8|a10g-small|a10g-large|a10g-largex2|a10g-largex4|a100-large|a100x4|a100x8|rtx-pro-6000|rtx-pro-6000x2|rtx-pro-6000x4|rtx-pro-6000x8] --sleep-time INTEGER --secrets TEXT --secrets-file TEXT --env TEXT --env-file TEXT --volume TEXT --format [auto|human|agent|json|quiet]]`
- `hf repos list` — List all repos (models, datasets, spaces, buckets) with storage info. `[--namespace TEXT --type [model|dataset|space|bucket] --search TEXT --limit INTEGER --explore --format [auto|human|agent|json|quiet]]`
- `hf repos move FROM_ID TO_ID` — Move a repository from a namespace to another namespace. `[--type [model|dataset|space|kernel] --format [auto|human|agent|json|quiet]]`
- `hf repos settings REPO_ID` — Update the settings of a repository. `[--gated [auto|manual|false] --private --public --protected --type [model|dataset|space|kernel] --format [auto|human|agent|json|quiet]]`
- `hf repos tag create REPO_ID TAG` — Create a tag for a repo. `[--message TEXT --revision TEXT --type [model|dataset|space|kernel] --format [auto|human|agent|json|quiet]]`
- `hf repos tag delete REPO_ID TAG` — Delete a tag for a repo. `[--yes --type [model|dataset|space|kernel] --format [auto|human|agent|json|quiet]]`
- `hf repos tag list REPO_ID` — List tags for a repo. `[--type [model|dataset|space|kernel] --format [auto|human|agent|json|quiet]]`

### `hf sandbox` — Run and manage experimental sandboxes on Hugging Face Jobs.

- `hf sandbox cp SRC DST` — Copy a file between the local machine and a sandbox (docker-style). `[--namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf sandbox create` — Create a sandbox: a dedicated VM by default, or a cheap shared one with `--pool`. `[--pool TEXT --flavor [cpu-basic|cpu-upgrade|cpu-performance|cpu-xl|t4-small|t4-medium|l4x1|l4x4|l40sx1|l40sx4|l40sx8|a10g-small|a10g-large|a10g-largex2|a10g-largex4|a100-large|a100x4|a100x8|h200|h200x2|h200x4|h200x8|rtx-pro-6000|rtx-pro-6000x2|rtx-pro-6000x4|rtx-pro-6000x8] --idle-timeout TEXT --env TEXT --secrets TEXT --label TEXT --env-file TEXT --secrets-file TEXT --volume TEXT --namespace TEXT --forward-hf-token --format [auto|human|agent|json|quiet]]`
- `hf sandbox exec SANDBOX_ID COMMAND` — Run a command in a sandbox, streaming output. Exits with the command's exit code. `[--workdir TEXT --env TEXT --env-file TEXT --timeout FLOAT --namespace TEXT]`
- `hf sandbox kill` — Terminate a sandbox, a whole shared host, or everything (--all). `[--all --yes --namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf sandbox pool create` — Warm a pool: boot one host VM now, tagged so it can be found later by its pool id. `[--flavor [cpu-basic|cpu-upgrade|cpu-performance|cpu-xl|t4-small|t4-medium|l4x1|l4x4|l40sx1|l40sx4|l40sx8|a10g-small|a10g-large|a10g-largex2|a10g-largex4|a100-large|a100x4|a100x8|h200|h200x2|h200x4|h200x8|rtx-pro-6000|rtx-pro-6000x2|rtx-pro-6000x4|rtx-pro-6000x8] --per-host INTEGER RANGE --max-hosts INTEGER RANGE --idle-timeout TEXT --namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf sandbox pool delete POOL_ID` — Terminate every host VM of a pool (and therefore all its sandboxes). `[--yes --namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf sandbox pool ls` — List running sandbox pools (grouped from their host VMs). `[--namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf sandbox process kill SANDBOX_ID PID` — Stop a background process running in a sandbox. `[--namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf sandbox process ls SANDBOX_ID` — List the background processes running in a sandbox (started with `hf sandbox spawn`). `[--namespace TEXT --format [auto|human|agent|json|quiet]]`
- `hf sandbox spawn SANDBOX_ID COMMAND` — Start a long-running command in the background and return its pid (don't wait). `[--workdir TEXT --env TEXT --env-file TEXT --namespace TEXT]`

### `hf skills` — Manage skills for AI assistants.

- `hf skills add` — Install a Hugging Face skill for an AI assistant. `[--global --dest PATH --force --format [auto|human|agent|json|quiet]]`
- `hf skills list` — List available skills from the Hugging Face marketplace. `[--format [auto|human|agent|json|quiet]]`
- `hf skills preview` — Print the generated `hf-cli` SKILL.md to stdout. `[--format [auto|human|agent|json|quiet]]`
- `hf skills update` — Update installed Hugging Face marketplace skills. `[--global --dest PATH --format [auto|human|agent|json|quiet]]`

### `hf spaces` — Interact with spaces on the Hub.

- `hf spaces card SPACE_ID` — Get the Space card (README) for a Space on the Hub. `[--metadata --text --format [auto|human|agent|json|quiet]]`
- `hf spaces dev-mode SPACE_ID` — Enable or disable dev mode on a Space. `[--stop --format [auto|human|agent|json|quiet]]`
- `hf spaces hardware` — List available hardware options for Spaces. `[--format [auto|human|agent|json|quiet]]`
- `hf spaces hot-reload SPACE_ID` — Hot-reload any Python file of a Space without a full rebuild + restart. `[--local-file PATH --skip-checks --skip-summary --format [auto|human|agent|json|quiet]]`
- `hf spaces info SPACE_ID` — Get info about a space on the Hub. `[--revision TEXT --expand TEXT --format [auto|human|agent|json|quiet]]`
- `hf spaces list` — List spaces on the Hub, or files in a space repo. `[--search TEXT --author TEXT --filter TEXT --sort [created_at|last_modified|likes|trending_score] --limit INTEGER --expand TEXT --human-readable --tree --recursive --revision TEXT --format [auto|human|agent|json|quiet]]`
- `hf spaces logs SPACE_ID` — Fetch the run or build logs of a Space. `[--build --follow --tail INTEGER --format [auto|human|agent|json|quiet]]`
- `hf spaces pause SPACE_ID` — Pause a Space. `[--format [auto|human|agent|json|quiet]]`
- `hf spaces restart SPACE_ID` — Restart a Space. `[--factory-reboot --format [auto|human|agent|json|quiet]]`
- `hf spaces search QUERY` — Search spaces on the Hub using semantic search. `[--filter TEXT --sdk TEXT --include-non-running --description --limit INTEGER --format [auto|human|agent|json|quiet]]`
- `hf spaces secrets add SPACE_ID` — Add or update secrets for a Space. `[--secrets TEXT --secrets-file TEXT --format [auto|human|agent|json|quiet]]`
- `hf spaces secrets delete SPACE_ID KEY` — Remove a secret from a Space. `[--yes --format [auto|human|agent|json|quiet]]`
- `hf spaces secrets list SPACE_ID` — List secrets for a Space. Secret values are write-only and not returned. `[--format [auto|human|agent|json|quiet]]`
- `hf spaces settings SPACE_ID` — Update the settings of a Space. `[--sleep-time INTEGER --hardware [cpu-basic|cpu-upgrade|zero-a10g|t4-small|t4-medium|l4x1|l4x4|l40sx1|l40sx4|l40sx8|a10g-small|a10g-large|a10g-largex2|a10g-largex4|a100-large|a100x4|a100x8|rtx-pro-6000|rtx-pro-6000x2|rtx-pro-6000x4|rtx-pro-6000x8] --format [auto|human|agent|json|quiet]]`
- `hf spaces ssh SPACE_ID` — SSH into a Space's Dev Mode container. `[--identity-file PATH --dry-run --auto --format [auto|human|agent|json|quiet]]`
- `hf spaces templates` — List the available Space templates. `[--format [auto|human|agent|json|quiet]]`
- `hf spaces variables add SPACE_ID` — Add or update environment variables for a Space. `[--env TEXT --env-file TEXT --format [auto|human|agent|json|quiet]]`
- `hf spaces variables delete SPACE_ID KEY` — Remove an environment variable from a Space. `[--yes --format [auto|human|agent|json|quiet]]`
- `hf spaces variables list SPACE_ID` — List environment variables for a Space. `[--format [auto|human|agent|json|quiet]]`
- `hf spaces volumes delete SPACE_ID` — Remove all volumes from a Space. `[--yes --format [auto|human|agent|json|quiet]]`
- `hf spaces volumes list SPACE_ID` — List volumes mounted in a Space. `[--format [auto|human|agent|json|quiet]]`
- `hf spaces volumes set SPACE_ID` — Set (replace) volumes for a Space. `[--volume TEXT --format [auto|human|agent|json|quiet]]`
- `hf spaces wait SPACE_ID` — Wait for a Space to finish building/starting. `[--timeout TEXT --format [auto|human|agent|json|quiet]]`
- `hf spaces zero-gpu quota` — Show your ZeroGPU quota (remaining GPU time and reset date). `[--format [auto|human|agent|json|quiet]]`

### `hf webhooks` — Manage webhooks on the Hub.

- `hf webhooks create --watch TEXT` — Create a new webhook. `[--url TEXT --job-id TEXT --domain [repo|discussions] --secret TEXT --secrets TEXT --secrets-file TEXT --format [auto|human|agent|json|quiet]]`
- `hf webhooks delete WEBHOOK_ID` — Delete a webhook permanently. `[--yes --format [auto|human|agent|json|quiet]]`
- `hf webhooks disable WEBHOOK_ID` — Disable an active webhook. `[--format [auto|human|agent|json|quiet]]`
- `hf webhooks enable WEBHOOK_ID` — Enable a disabled webhook. `[--format [auto|human|agent|json|quiet]]`
- `hf webhooks info WEBHOOK_ID` — Show full details for a single webhook. `[--format [auto|human|agent|json|quiet]]`
- `hf webhooks list` — List all webhooks for the current user. `[--format [auto|human|agent|json|quiet]]`
- `hf webhooks update WEBHOOK_ID` — Update an existing webhook. Only provided options are changed. `[--url TEXT --job-id TEXT --watch TEXT --domain [repo|discussions] --secret TEXT --secrets TEXT --secrets-file TEXT --format [auto|human|agent|json|quiet]]`

## Common options

- `--format` — Output format: `--format json` (or `--json`) or `--format table` (default).
- `-q / --quiet` — Quiet output (one ID per line). Equivalent to '--format quiet'.
- `--revision` — Git revision id which can be a branch name, a tag, or a commit hash.
- `--token` — Use a User Access Token. Prefer setting `HF_TOKEN` env var instead of passing `--token`.
- `--type` — The type of repository (model, dataset, space, or kernel).

## Mounting repos as local filesystems

To mount Hub repositories or buckets as local filesystems — no download, no copy, no waiting — use `hf-mount`. Files are fetched on demand. GitHub: https://github.com/huggingface/hf-mount

Install: `brew install hf-mount`, or download a binary from https://github.com/huggingface/hf-mount/releases

Some command examples:
- `hf-mount start repo openai-community/gpt2 /tmp/gpt2` — mount a repo (read-only)
- `hf-mount start --hf-token $HF_TOKEN bucket myuser/my-bucket /tmp/data` — mount a bucket (read-write)
- `hf-mount status` / `hf-mount stop /tmp/data` — list or unmount

## Tips

- Use `hf <command> --help` for full options, descriptions, usage, and real-world examples
- Authenticate with `HF_TOKEN` env var (recommended) or with `--token`
- Update the CLI with `hf update` (uses the correct command for the detected install method)
