# Quick Start


## Give n8n a spin

To spin up n8n to have a look you can run:

```bash
npx n8n
```

It will then download everything which is needed and start n8n.

You can then access n8n by opening:
[http://localhost:5678](http://localhost:5678)


## Start with docker

To just play around a little bit you can start n8n with docker.

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  n8nio/n8n
```

Be aware that all data will be lost once the docker container got removed. To
persist the data mount the `~/.n8n` folder:

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/root/.n8n \
  n8nio/n8n
```

More information about the Docker setup can be found the README of the
[Docker Image](https://github.com/n8n-io/n8n/blob/master/docker/images/n8n/README.md)
