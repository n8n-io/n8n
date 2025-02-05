ARG NODE_VERSION=20
FROM n8nio/n8n
USER root
RUN npm install -g neo4j-driver mailgun-js form-data
USER node
