# n8n - Custom Image

Dockerfile which allows to package up Qickplay patched n8n code into a docker image.

## Usage

Execute the following in the n8n root folder:

```bash
docker build -t n8n-custom -f docker/images/qp-custom/Dockerfile .
```

## Development

Dockerfile from `docker/images/n8n-custom` has problems. Image build executed succefully, but `docker run -ti --rm n8n-custom n8n worker` reults in an error:

```
Error: Cannot find module '/data/worker'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1075:15)
    at Module._load (node:internal/modules/cjs/loader:920:27)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)
    at node:internal/main/run_main_module:23:47 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}
```

The problem relates to non root user. There is differencies between `n8n` and `n8n-custom`. Base `n8n` image use root user and `n8n-custom` use `node` user and it has problems. So this Dockerfile is a mixture of base and custom Dockerfiles.
