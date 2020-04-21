# Quick Start


## Give n8n a spin

To spin up n8n, you can run:

```bash
npx n8n
```

It will download everything that is needed to start n8n.

You can then access n8n by opening:
[http://localhost:5678](http://localhost:5678)


## Start with docker

To play around with n8n, you can also start it using docker:

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  n8nio/n8n
```

Be aware that all the data will be lost once the docker container gets removed. To
persist the data mount the `~/.n8n` folder:

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/root/.n8n \
  n8nio/n8n
```

More information about the Docker setup can be found in the README file of the
[Docker Image](https://github.com/n8n-io/n8n/blob/master/docker/images/n8n/README.md).

In case you run into issues, check out the [troubleshooting](troubleshooting.md) page or ask for help in the community [forum](https://community.n8n.io/).
