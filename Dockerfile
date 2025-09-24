# Dockerfile - simple: use official n8n image
FROM n8nio/n8n:latest

# expose the internal n8n port (informational only)
EXPOSE 5678

# image already contains entrypoint/cmd for n8n
