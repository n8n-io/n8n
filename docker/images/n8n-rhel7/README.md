## Build Docker-Image

```
docker build --build-arg N8N_VERSION=<VERSION> -t n8nio/n8n:<VERSION> .

# For example:
docker build --build-arg N8N_VERSION=0.36.1 -t n8nio/n8n:0.36.1-rhel7 .
```

```
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  n8nio/n8n:0.25.0-ubuntu
```
