## Environments

Environments enable enterprise users of n8n to effectively manage multiple deployments of n8n by synchronizing them using a shared git repostiory.

[Link to docs](https://docs.n8n.io/source-control-environments/understand/environments/)

### Local development

When using the "usual" `pnpm run dev` scripts to start a local n8n instance, your local git settings and credentials will be picked up by the git repository that is cloned within n8n.

This is why you should start n8n in a docker container when doing any kind of manual testing of this feature.

Building a local docker image from your local checkout:
`pnpm build:docker`

Starting a local container using that image:
`pnpm --filter n8n-containers stack:enterprise`

The development experience of running n8n from source in a docker container still leaves a lot to be desired (lots of waiting for building and running the container).
We should improve on this in the future.