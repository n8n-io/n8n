ARG NODE_VERSION=20
FROM n8nio/n8n:latest
USER root
RUN npm install neo4j-driver mailgun.js form-data
USER node
